import {
  buildDependencyGraph,
  generateEdgesFromItems,
  setUnsetEquipmentPositions,
  type LayoutNode,
} from '../flowLayoutAlgorithm';

describe('Flow Layout Algorithm', () => {
  let mockNodes: LayoutNode[];

  beforeEach(() => {
    mockNodes = [
      {
        id: 'GEN-01',
        type: 'Generator',
        loads: [{ id: 'BUS-01' }],
        sources: [],
        width: 100,
        height: 50,
        name: 'Generator 1',
      },
      {
        id: 'BUS-01',
        type: 'Bus',
        loads: [{ id: 'LOAD-01' }],
        sources: [{ id: 'GEN-01' }],
        width: 200,
        height: 40,
        name: 'Main Bus',
      },
      {
        id: 'LOAD-01',
        type: 'Other',
        loads: [],
        sources: [{ id: 'BUS-01' }],
        width: 80,
        height: 60,
        name: 'Load 1',
      },
    ];
  });

  describe('buildDependencyGraph', () => {
    test('builds correct dependency graph', () => {
      const result = buildDependencyGraph(mockNodes);
      
      expect(result.graph.get('GEN-01')).toEqual(new Set(['BUS-01']));
      expect(result.graph.get('BUS-01')).toEqual(new Set(['LOAD-01']));
      expect(result.graph.get('LOAD-01')).toEqual(new Set());
      
      expect(result.inDegree.get('GEN-01')).toBe(0);
      expect(result.inDegree.get('BUS-01')).toBe(1);
      expect(result.inDegree.get('LOAD-01')).toBe(1);
    });

    test('handles nodes with no connections', () => {
      const isolatedNodes: LayoutNode[] = [
        {
          id: 'ISOLATED-01',
          type: 'Other',
          loads: [],
          sources: [],
          width: 100,
          height: 50,
        },
      ];

      const result = buildDependencyGraph(isolatedNodes);
      
      expect(result.graph.get('ISOLATED-01')).toEqual(new Set());
      expect(result.inDegree.get('ISOLATED-01')).toBe(0);
    });
  });

  describe('generateEdgesFromItems', () => {
    test('generates correct edges from layout nodes', () => {
      const edges = generateEdgesFromItems(mockNodes);
      
      expect(edges).toHaveLength(2);
      
      expect(edges[0]).toEqual({
        id: 'GEN-01-BUS-01',
        source: 'GEN-01',
        target: 'BUS-01',
        sourceHandle: 'bottom',
        targetHandle: 'top-0',
      });
      
      expect(edges[1]).toEqual({
        id: 'BUS-01-LOAD-01',
        source: 'BUS-01',
        target: 'LOAD-01',
        sourceHandle: 'bottom-0',
        targetHandle: 'top',
      });
    });

    test('handles nodes with no connections', () => {
      const isolatedNodes: LayoutNode[] = [
        {
          id: 'ISOLATED-01',
          type: 'Other',
          loads: [],
          sources: [],
          width: 100,
          height: 50,
        },
      ];

      const edges = generateEdgesFromItems(isolatedNodes);
      expect(edges).toHaveLength(0);
    });

    test('handles multiple connections correctly', () => {
      const multiConnectionNodes: LayoutNode[] = [
        {
          id: 'GEN-01',
          type: 'Generator',
          loads: [{ id: 'BUS-01' }],
          sources: [],
          width: 100,
          height: 50,
        },
        {
          id: 'GEN-02',
          type: 'Generator',
          loads: [{ id: 'BUS-01' }],
          sources: [],
          width: 100,
          height: 50,
        },
        {
          id: 'BUS-01',
          type: 'Bus',
          loads: [{ id: 'LOAD-01' }, { id: 'LOAD-02' }],
          sources: [{ id: 'GEN-01' }, { id: 'GEN-02' }],
          width: 200,
          height: 40,
        },
        {
          id: 'LOAD-01',
          type: 'Other',
          loads: [],
          sources: [{ id: 'BUS-01' }],
          width: 80,
          height: 60,
        },
        {
          id: 'LOAD-02',
          type: 'Other',
          loads: [],
          sources: [{ id: 'BUS-01' }],
          width: 80,
          height: 60,
        },
      ];

      const edges = generateEdgesFromItems(multiConnectionNodes);
      expect(edges).toHaveLength(4); // 2 generators -> bus, bus -> 2 loads
    });
  });

  describe('setUnsetEquipmentPositions', () => {
    test('sets positions for equipment with no position', () => {
      const nodesWithoutPositions = mockNodes.map(node => ({ ...node, position: undefined }));
      
      const result = setUnsetEquipmentPositions(nodesWithoutPositions, {
        vertSpace: 120,
        nodeSpacing: 100,
        margin: 50,
      });
      
      // All nodes should have positions set
      result.forEach(node => {
        expect(node.position).toBeDefined();
        expect(typeof node.position?.x).toBe('number');
        expect(typeof node.position?.y).toBe('number');
      });
    });

    test('preserves existing positions', () => {
      const nodesWithPositions = [
        { ...mockNodes[0], position: { x: 100, y: 200 } },
        { ...mockNodes[1], position: undefined },
        { ...mockNodes[2], position: undefined },
      ];
      
      const result = setUnsetEquipmentPositions(nodesWithPositions);
      
      // First node should keep its position
      expect(result[0].position).toEqual({ x: 100, y: 200 });
      
      // Other nodes should have new positions
      expect(result[1].position).toBeDefined();
      expect(result[2].position).toBeDefined();
    });

    test('handles nodes with zero positions correctly', () => {
      const nodesWithZeroPositions = mockNodes.map(node => ({ 
        ...node, 
        position: { x: 0, y: 0 } 
      }));
      
      const result = setUnsetEquipmentPositions(nodesWithZeroPositions);
      
      // All nodes should have non-zero positions
      result.forEach(node => {
        expect(node.position).toBeDefined();
        expect(node.position!.x).toBeGreaterThanOrEqual(50); // margin
        expect(node.position!.y).toBeGreaterThanOrEqual(50); // margin
      });
    });
  });

  describe('Layout algorithm integration', () => {
    test('produces logical vertical layout for simple chain', () => {
      const result = setUnsetEquipmentPositions(mockNodes, {
        vertSpace: 120,
        nodeSpacing: 100,
        margin: 50,
      });
      
      // Find nodes by ID for easier testing
      const generator = result.find(n => n.id === 'GEN-01')!;
      const bus = result.find(n => n.id === 'BUS-01')!;
      const load = result.find(n => n.id === 'LOAD-01')!;
      
      // Generator should be at the top
      expect(generator.position!.y).toBeLessThan(bus.position!.y);
      
      // Load should be at the bottom
      expect(bus.position!.y).toBeLessThan(load.position!.y);
      
      // Vertical spacing should be reasonable
      const generatorToBusSpacing = bus.position!.y - (generator.position!.y + generator.height);
      const busToLoadSpacing = load.position!.y - (bus.position!.y + bus.height);
      
      expect(generatorToBusSpacing).toBeGreaterThan(0);
      expect(busToLoadSpacing).toBeGreaterThan(0);
    });

    test('handles complex branching layouts', () => {
      const complexNodes: LayoutNode[] = [
        {
          id: 'GEN-01',
          type: 'Generator',
          loads: [{ id: 'BUS-01' }],
          sources: [],
          width: 100,
          height: 50,
        },
        {
          id: 'BUS-01',
          type: 'Bus',
          loads: [{ id: 'T-01' }, { id: 'LOAD-01' }],
          sources: [{ id: 'GEN-01' }],
          width: 200,
          height: 40,
        },
        {
          id: 'T-01',
          type: 'Transformer',
          loads: [{ id: 'BUS-02' }],
          sources: [{ id: 'BUS-01' }],
          width: 80,
          height: 80,
        },
        {
          id: 'BUS-02',
          type: 'Bus',
          loads: [{ id: 'LOAD-02' }],
          sources: [{ id: 'T-01' }],
          width: 200,
          height: 40,
        },
        {
          id: 'LOAD-01',
          type: 'Other',
          loads: [],
          sources: [{ id: 'BUS-01' }],
          width: 80,
          height: 60,
        },
        {
          id: 'LOAD-02',
          type: 'Other',
          loads: [],
          sources: [{ id: 'BUS-02' }],
          width: 80,
          height: 60,
        },
      ];

      const result = setUnsetEquipmentPositions(complexNodes);
      
      // All nodes should have positions
      result.forEach(node => {
        expect(node.position).toBeDefined();
        expect(node.position!.x).toBeGreaterThanOrEqual(0);
        expect(node.position!.y).toBeGreaterThanOrEqual(0);
      });
      
      // Check hierarchical relationships
      const generator = result.find(n => n.id === 'GEN-01')!;
      const bus1 = result.find(n => n.id === 'BUS-01')!;
      const load1 = result.find(n => n.id === 'LOAD-01')!;
      const transformer = result.find(n => n.id === 'T-01')!;
      
      // Generator should be above bus1
      expect(generator.position!.y).toBeLessThan(bus1.position!.y);
      
      // Bus1 should be above its loads
      expect(bus1.position!.y).toBeLessThan(load1.position!.y);
      expect(bus1.position!.y).toBeLessThan(transformer.position!.y);
    });
  });
});
