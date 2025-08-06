import { renderHook } from '@testing-library/react';
import { useNodeSnapping } from '../flowHooks/useNodeSnapping';
import EquipmentBase from '../../../../models/equipmentBase';

describe('useNodeSnapping', () => {
  beforeEach(() => {
    EquipmentBase.clearRegistry();
  });

  afterEach(() => {
    EquipmentBase.clearRegistry();
  });

  test('should initialize with empty snap lines', () => {
    const equipmentList: EquipmentBase[] = [];
    
    const { result } = renderHook(() => useNodeSnapping({
      equipmentList,
      snapThreshold: 20,
    }));

    expect(result.current.snapLines).toEqual([]);
    expect(typeof result.current.createSnappingHandler).toBe('function');
    expect(typeof result.current.getHandleCenterPosition).toBe('function');
    expect(typeof result.current.snapToStraightEdge).toBe('function');
  });

  test('should create snapping handler function', () => {
    const equipmentList: EquipmentBase[] = [];
    const mockNodes: any[] = [];
    const mockEdges: any[] = [];
    const mockOnNodesChange = jest.fn();
    
    const { result } = renderHook(() => useNodeSnapping({
      equipmentList,
      snapThreshold: 20,
    }));

    const snappingHandler = result.current.createSnappingHandler(
      mockNodes,
      mockEdges,
      mockOnNodesChange
    );

    expect(typeof snappingHandler).toBe('function');
  });

  test('should handle node position changes without snapping when no connections exist', () => {
    const equipmentList: EquipmentBase[] = [];
    const mockNodes: any[] = [];
    const mockEdges: any[] = [];
    const mockOnNodesChange = jest.fn();
    
    const { result } = renderHook(() => useNodeSnapping({
      equipmentList,
      snapThreshold: 20,
    }));

    const snappingHandler = result.current.createSnappingHandler(
      mockNodes,
      mockEdges,
      mockOnNodesChange
    );

    const changes = [{
      id: 'node-1',
      type: 'position' as const,
      position: { x: 100, y: 100 },
      dragging: false,
    }];

    snappingHandler(changes);

    expect(mockOnNodesChange).toHaveBeenCalledWith(changes);
  });
});
