import { EquipmentBase } from './equipment';
import type { EquipmentType } from '../types/equipment.types';

describe('EquipmentBase', () => {
  beforeEach(() => {
    // Clear the registry before each test to ensure clean state
    EquipmentBase.clearRegistry();
  });

  afterEach(() => {
    // Clean up after each test
    EquipmentBase.clearRegistry();
  });

  describe('Equipment Creation', () => {
    test('should create equipment with valid properties', () => {
      const generator = new EquipmentBase('GEN-01', 'Main Generator', 'Generator' as EquipmentType);
      
      expect(generator.id).toBe('GEN-01');
      expect(generator.name).toBe('Main Generator');
      expect(generator.type).toBe('Generator');
      expect(generator.sourceIds).toEqual([]);
      expect(generator.loadIds).toEqual([]);
    });

    test('should throw error when creating equipment with duplicate ID', () => {
      new EquipmentBase('GEN-01', 'Generator 1', 'Generator' as EquipmentType);
      
      expect(() => {
        new EquipmentBase('GEN-01', 'Generator 2', 'Generator' as EquipmentType);
      }).toThrow('Equipment with ID "GEN-01" already exists');
    });

    test('should register equipment in static registry', () => {
      const generator = new EquipmentBase('GEN-01', 'Main Generator', 'Generator' as EquipmentType);
      
      expect(EquipmentBase.getById('GEN-01')).toBe(generator);
      expect(EquipmentBase.getAll()).toContain(generator);
    });
  });

  describe('Equipment Connections', () => {
    let generator: EquipmentBase;
    let transformer: EquipmentBase;
    let switchgear: EquipmentBase;
    let motor1: EquipmentBase;
    let motor2: EquipmentBase;

    beforeEach(() => {
      generator = new EquipmentBase('GEN-01', 'Main Generator', 'Generator' as EquipmentType);
      transformer = new EquipmentBase('XFMR-01', 'Main Transformer', 'Transformer' as EquipmentType);
      switchgear = new EquipmentBase('SWG-01', 'Main Switchgear', 'Switchgear' as EquipmentType);
      motor1 = new EquipmentBase('MTR-01', 'Pump Motor 1', 'Motor' as EquipmentType);
      motor2 = new EquipmentBase('MTR-02', 'Fan Motor 2', 'Motor' as EquipmentType);
    });

    test('should create bidirectional connections using addLoad', () => {
      generator.addLoad(transformer);
      
      expect(generator.loadIds).toContain('XFMR-01');
      expect(transformer.sourceIds).toContain('GEN-01');
      expect(generator.isConnectedTo(transformer)).toBe(true);
      expect(transformer.isConnectedTo(generator)).toBe(true);
    });

    test('should create bidirectional connections using addSource', () => {
      transformer.addSource(generator);
      
      expect(transformer.sourceIds).toContain('GEN-01');
      expect(generator.loadIds).toContain('XFMR-01');
      expect(generator.isConnectedTo(transformer)).toBe(true);
      expect(transformer.isConnectedTo(generator)).toBe(true);
    });

    test('should handle multiple connections correctly', () => {
      // Create power flow: generator -> transformer -> switchgear -> motors
      generator.addLoad(transformer);
      transformer.addLoad(switchgear);
      switchgear.addLoad(motor1);
      switchgear.addLoad(motor2);

      expect(generator.loadIds).toEqual(['XFMR-01']);
      expect(transformer.sourceIds).toEqual(['GEN-01']);
      expect(transformer.loadIds).toEqual(['SWG-01']);
      expect(switchgear.sourceIds).toEqual(['XFMR-01']);
      expect(switchgear.loadIds).toContain('MTR-01');
      expect(switchgear.loadIds).toContain('MTR-02');
      expect(motor1.sourceIds).toEqual(['SWG-01']);
      expect(motor2.sourceIds).toEqual(['SWG-01']);
    });

    test('should remove connections properly', () => {
      generator.addLoad(transformer);
      generator.removeLoad(transformer);
      
      expect(generator.loadIds).not.toContain('XFMR-01');
      expect(transformer.sourceIds).not.toContain('GEN-01');
      expect(generator.isConnectedTo(transformer)).toBe(false);
    });

    test('should connect by ID using static method', () => {
      const success = EquipmentBase.connectById('GEN-01', 'XFMR-01');
      
      expect(success).toBe(true);
      expect(generator.loadIds).toContain('XFMR-01');
      expect(transformer.sourceIds).toContain('GEN-01');
    });

    test('should return false when connecting non-existent equipment', () => {
      const success = EquipmentBase.connectById('NON-EXISTENT', 'XFMR-01');
      
      expect(success).toBe(false);
    });
  });

  describe('Equipment Queries', () => {
    let generator: EquipmentBase;
    let transformer: EquipmentBase;
    let motor1: EquipmentBase;
    let motor2: EquipmentBase;

    beforeEach(() => {
      generator = new EquipmentBase('GEN-01', 'Main Generator', 'Generator' as EquipmentType);
      transformer = new EquipmentBase('XFMR-01', 'Main Transformer', 'Transformer' as EquipmentType);
      motor1 = new EquipmentBase('MTR-01', 'Pump Motor 1', 'Motor' as EquipmentType);
      motor2 = new EquipmentBase('MTR-02', 'Fan Motor 2', 'Motor' as EquipmentType);
    });

    test('should retrieve equipment by ID', () => {
      const foundGenerator = EquipmentBase.getById('GEN-01');
      
      expect(foundGenerator).toBe(generator);
    });

    test('should return undefined for non-existent ID', () => {
      const notFound = EquipmentBase.getById('NON-EXISTENT');
      
      expect(notFound).toBeUndefined();
    });

    test('should get all equipment', () => {
      const allEquipment = EquipmentBase.getAll();
      
      expect(allEquipment).toHaveLength(4);
      expect(allEquipment).toContain(generator);
      expect(allEquipment).toContain(transformer);
      expect(allEquipment).toContain(motor1);
      expect(allEquipment).toContain(motor2);
    });

    test('should filter equipment by type', () => {
      const motors = EquipmentBase.getAllByType(EquipmentBase).filter(eq => eq.type === 'Motor');
      
      expect(motors).toHaveLength(2);
      expect(motors).toContain(motor1);
      expect(motors).toContain(motor2);
    });
  });

  describe('JSON Serialization', () => {
    let generator: EquipmentBase;
    let transformer: EquipmentBase;

    beforeEach(() => {
      generator = new EquipmentBase('GEN-01', 'Main Generator', 'Generator' as EquipmentType);
      transformer = new EquipmentBase('XFMR-01', 'Main Transformer', 'Transformer' as EquipmentType);
      generator.addLoad(transformer);
    });

    test('should serialize equipment to JSON', () => {
      const jsonData = generator.toJSON();
      
      expect(jsonData).toEqual({
        id: 'GEN-01',
        name: 'Main Generator',
        type: 'Generator',
        sourceIds: [],
        loadIds: ['XFMR-01']
      });
    });

    test('should recreate equipment from JSON', () => {
      const jsonData = generator.toJSON();
      EquipmentBase.clearRegistry();
      
      const recreated = EquipmentBase.fromJSON(jsonData);
      
      expect(recreated.id).toBe('GEN-01');
      expect(recreated.name).toBe('Main Generator');
      expect(recreated.type).toBe('Generator');
    });

    test('should rebuild connections from JSON data', () => {
      const allEquipment = EquipmentBase.getAll();
      const jsonData = allEquipment.map(eq => eq.toJSON());
      
      // Clear registry and recreate equipment
      EquipmentBase.clearRegistry();
      jsonData.forEach(data => EquipmentBase.fromJSON(data));
      
      // Rebuild connections
      EquipmentBase.rebuildConnections(jsonData);
      
      const recreatedGenerator = EquipmentBase.getById('GEN-01');
      const recreatedTransformer = EquipmentBase.getById('XFMR-01');
      
      expect(recreatedGenerator?.loadIds).toContain('XFMR-01');
      expect(recreatedTransformer?.sourceIds).toContain('GEN-01');
    });
  });

  describe('Network Analysis', () => {
    let generator: EquipmentBase;
    let transformer: EquipmentBase;
    let switchgear: EquipmentBase;
    let motor1: EquipmentBase;
    let motor2: EquipmentBase;

    beforeEach(() => {
      generator = new EquipmentBase('GEN-01', 'Main Generator', 'Generator' as EquipmentType);
      transformer = new EquipmentBase('XFMR-01', 'Main Transformer', 'Transformer' as EquipmentType);
      switchgear = new EquipmentBase('SWG-01', 'Main Switchgear', 'Switchgear' as EquipmentType);
      motor1 = new EquipmentBase('MTR-01', 'Pump Motor 1', 'Motor' as EquipmentType);
      motor2 = new EquipmentBase('MTR-02', 'Fan Motor 2', 'Motor' as EquipmentType);

      // Create network: generator -> transformer -> switchgear -> motors
      generator.addLoad(transformer);
      transformer.addLoad(switchgear);
      switchgear.addLoad(motor1);
      switchgear.addLoad(motor2);
    });

    test('should find path between equipment', () => {
      const path = findPath(generator, motor1);
      
      expect(path).not.toBeNull();
      expect(path).toHaveLength(4);
      expect(path![0]).toBe(generator);
      expect(path![3]).toBe(motor1);
    });

    test('should return null for non-existent path', () => {
      const isolatedEquipment = new EquipmentBase('ISO-01', 'Isolated', 'Other' as EquipmentType);
      const path = findPath(generator, isolatedEquipment);
      
      expect(path).toBeNull();
    });

    test('should identify sources (equipment with no sources)', () => {
      const allEquipment = EquipmentBase.getAll();
      const sources = allEquipment.filter(eq => eq.sourceIds.length === 0);
      
      expect(sources).toHaveLength(1);
      expect(sources[0]).toBe(generator);
    });

    test('should identify sinks (equipment with no loads)', () => {
      const allEquipment = EquipmentBase.getAll();
      const sinks = allEquipment.filter(eq => eq.loadIds.length === 0);
      
      expect(sinks).toHaveLength(2);
      expect(sinks).toContain(motor1);
      expect(sinks).toContain(motor2);
    });
  });
});

// Helper function for path finding (moved from example)
function findPath(from: EquipmentBase, to: EquipmentBase, visited = new Set<EquipmentBase>()): EquipmentBase[] | null {
  if (from === to) return [from];
  if (visited.has(from)) return null;
  
  visited.add(from);
  
  for (const connection of from.connections) {
    const path = findPath(connection, to, visited);
    if (path) return [from, ...path];
  }
  
  return null;
}