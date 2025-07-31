// Integration tests for equipment models
// Individual equipment models have their own dedicated test files:
// - equipmentBase.test.ts: Core EquipmentBase functionality
// - busEquipment.test.ts: Bus-specific functionality  
// - generatorEquipment.test.ts: Generator-specific functionality
// - transformerEquipment.test.ts: Transformer-specific functionality

import EquipmentBase from '../equipmentBase';
import Generator from '../generatorEquipment';
import Transformer from '../transformerEquipment';
import Bus from '../busEquipment';
import type { EquipmentType } from '../../types/equipment.types';

describe('Equipment Integration Tests', () => {
  beforeEach(() => {
    EquipmentBase.clearRegistry();
  });

  afterEach(() => {
    EquipmentBase.clearRegistry();
  });

  describe('Multi-Equipment Network Integration', () => {
    test('should create and connect a complete electrical network', () => {
      // Create a typical power system: Generator -> Transformer -> Bus -> Motors
      const generator = new Generator('GEN-01', 'Main Generator', {
        capacity: 25.0,
        voltage: 13.8,
        fuelType: 'natural_gas',
        efficiency: 92.5,
        isOnline: true
      });

      const transformer = new Transformer('XFMR-01', 'Main Transformer', {
        primaryVoltage: 13.8,
        secondaryVoltage: 4.16,
        powerRating: 25.0,
        phaseCount: 3,
        connectionType: 'Delta',
        impedance: 5.75,
        isOperational: true
      });

      const bus = new Bus('BUS-01', 'Main Bus', {
        voltage: 4.16,
        width: 100
      });

      const motor1 = new EquipmentBase('MTR-01', 'Pump Motor', 'Motor' as EquipmentType);
      const motor2 = new EquipmentBase('MTR-02', 'Fan Motor', 'Motor' as EquipmentType);

      // Connect the network
      generator.addLoad(transformer);
      transformer.addLoad(bus);
      bus.addLoad(motor1);
      bus.addLoad(motor2);

      // Verify complete network connectivity
      expect(generator.loadIds).toContain('XFMR-01');
      expect(transformer.sourceIds).toContain('GEN-01');
      expect(transformer.loadIds).toContain('BUS-01');
      expect(bus.sourceIds).toContain('XFMR-01');
      expect(bus.loadIds).toContain('MTR-01');
      expect(bus.loadIds).toContain('MTR-02');
      expect(motor1.sourceIds).toContain('BUS-01');
      expect(motor2.sourceIds).toContain('BUS-01');
    });

    test('should serialize and deserialize complete network', () => {
      // Create network
      const generator = new Generator('GEN-01', 'Main Generator', {
        capacity: 25.0,
        voltage: 13.8,
        fuelType: 'natural_gas',
        efficiency: 92.5,
        isOnline: true
      });

      const transformer = new Transformer('XFMR-01', 'Main Transformer', {
        primaryVoltage: 13.8,
        secondaryVoltage: 4.16,
        powerRating: 25.0,
        phaseCount: 3,
        connectionType: 'Delta',
        impedance: 5.75,
        isOperational: true
      });

      const bus = new Bus('BUS-01', 'Main Bus', {
        voltage: 4.16,
        width: 100
      });

      generator.addLoad(transformer);
      transformer.addLoad(bus);

      // Serialize all equipment
      const allEquipment = EquipmentBase.getAll();
      const serializedData = allEquipment.map(eq => eq.toJSON());

      // Clear and recreate
      EquipmentBase.clearRegistry();
      
      // Recreate equipment (order doesn't matter for creation)
      serializedData.forEach(data => {
        if (data.type === 'Generator') {
          Generator.fromJSON(data as any);
        } else if (data.type === 'Transformer') {
          Transformer.fromJSON(data as any);
        } else if (data.type === 'Bus') {
          Bus.fromJSON(data as any);
        } else {
          EquipmentBase.fromJSON(data);
        }
      });

      // Rebuild connections
      EquipmentBase.rebuildConnections(serializedData);

      // Verify network is restored
      const restoredGenerator = EquipmentBase.getById('GEN-01', Generator);
      const restoredTransformer = EquipmentBase.getById('XFMR-01', Transformer);
      const restoredBus = EquipmentBase.getById('BUS-01', Bus);

      expect(restoredGenerator).toBeDefined();
      expect(restoredTransformer).toBeDefined();
      expect(restoredBus).toBeDefined();

      expect(restoredGenerator!.loadIds).toContain('XFMR-01');
      expect(restoredTransformer!.sourceIds).toContain('GEN-01');
      expect(restoredTransformer!.loadIds).toContain('BUS-01');
      expect(restoredBus!.sourceIds).toContain('XFMR-01');
    });

    test('should handle mixed equipment types in network queries', () => {
      const generator = new Generator('GEN-01', 'Main Generator', {
        capacity: 25.0,
        voltage: 13.8,
        fuelType: 'natural_gas',
        efficiency: 92.5,
        isOnline: true
      });

      const transformer = new Transformer('XFMR-01', 'Main Transformer', {
        primaryVoltage: 13.8,
        secondaryVoltage: 4.16,
        powerRating: 25.0,
        phaseCount: 3,
        connectionType: 'Delta',
        impedance: 5.75,
        isOperational: true
      });

      const bus = new Bus('BUS-01', 'Main Bus', {
        voltage: 4.16,
        width: 100
      });

      generator.addLoad(transformer);
      transformer.addLoad(bus);

      // Test type-specific queries
      const allGenerators = EquipmentBase.getAllByType(Generator);
      const allTransformers = EquipmentBase.getAllByType(Transformer);
      const allBuses = EquipmentBase.getAllByType(Bus);

      expect(allGenerators).toHaveLength(1);
      expect(allTransformers).toHaveLength(1);
      expect(allBuses).toHaveLength(1);

      expect(allGenerators[0]).toBe(generator);
      expect(allTransformers[0]).toBe(transformer);
      expect(allBuses[0]).toBe(bus);
    });
  });

  describe('Network Path Finding and Analysis', () => {
    let generator: Generator;
    let transformer: Transformer;
    let bus: Bus;
    let motor1: EquipmentBase;
    let motor2: EquipmentBase;

    beforeEach(() => {
      generator = new Generator('GEN-01', 'Main Generator', {
        capacity: 25.0,
        voltage: 13.8,
        fuelType: 'natural_gas',
        efficiency: 92.5,
        isOnline: true
      });

      transformer = new Transformer('XFMR-01', 'Main Transformer', {
        primaryVoltage: 13.8,
        secondaryVoltage: 4.16,
        powerRating: 25.0,
        phaseCount: 3,
        connectionType: 'Delta',
        impedance: 5.75,
        isOperational: true
      });

      bus = new Bus('BUS-01', 'Main Bus', {
        voltage: 4.16,
        width: 100
      });

      motor1 = new EquipmentBase('MTR-01', 'Pump Motor', 'Motor' as EquipmentType);
      motor2 = new EquipmentBase('MTR-02', 'Fan Motor', 'Motor' as EquipmentType);

      // Create network
      generator.addLoad(transformer);
      transformer.addLoad(bus);
      bus.addLoad(motor1);
      bus.addLoad(motor2);
    });

    test('should find paths between equipment in network', () => {
      const path = findPath(generator, motor1);
      
      expect(path).not.toBeNull();
      expect(path).toHaveLength(4);
      expect(path![0]).toBe(generator);
      expect(path![1]).toBe(transformer);
      expect(path![2]).toBe(bus);
      expect(path![3]).toBe(motor1);
    });

    test('should identify network topology', () => {
      const allEquipment = EquipmentBase.getAll();
      
      // Sources (no upstream connections)
      const sources = allEquipment.filter(eq => eq.sourceIds.length === 0);
      expect(sources).toHaveLength(1);
      expect(sources[0]).toBe(generator);
      
      // Sinks (no downstream connections)
      const sinks = allEquipment.filter(eq => eq.loadIds.length === 0);
      expect(sinks).toHaveLength(2);
      expect(sinks).toContain(motor1);
      expect(sinks).toContain(motor2);
      
      // Distribution points (multiple loads)
      const distributionPoints = allEquipment.filter(eq => eq.loadIds.length > 1);
      expect(distributionPoints).toHaveLength(1);
      expect(distributionPoints[0]).toBe(bus);
    });

    test('should handle equipment failures in network analysis', () => {
      // Simulate transformer failure
      transformer.isOperational = false;
      
      // Network structure remains intact but transformer is non-operational
      expect(generator.isConnectedTo(transformer)).toBe(true);
      expect(transformer.isConnectedTo(bus)).toBe(true);
      expect(transformer.isOperational).toBe(false);
      
      // In a real power system, this would isolate downstream equipment
      const path = findPath(generator, motor1);
      expect(path).not.toBeNull(); // Path still exists structurally
    });
  });

  describe('Equipment State Management', () => {
    test('should manage online/offline states across equipment types', () => {
      const generator = new Generator('GEN-01', 'Main Generator', {
        capacity: 25.0,
        voltage: 13.8,
        fuelType: 'natural_gas',
        efficiency: 92.5,
        isOnline: true
      });

      const transformer = new Transformer('XFMR-01', 'Main Transformer', {
        primaryVoltage: 13.8,
        secondaryVoltage: 4.16,
        powerRating: 25.0,
        phaseCount: 3,
        connectionType: 'Delta',
        impedance: 5.75,
        isOperational: true
      });

      // Test initial states
      expect(generator.isOnline).toBe(true);
      expect(transformer.isOperational).toBe(true);

      // Test state changes
      generator.stop();
      transformer.stop();

      expect(generator.isOnline).toBe(false);
      expect(transformer.isOperational).toBe(false);

      // Test restart
      generator.start();
      transformer.start();

      expect(generator.isOnline).toBe(true);
      expect(transformer.isOperational).toBe(true);
    });

    test('should calculate power outputs based on states', () => {
      const generator = new Generator('GEN-01', 'Main Generator', {
        capacity: 100.0,
        voltage: 13.8,
        fuelType: 'natural_gas',
        efficiency: 95.0,
        isOnline: true
      });

      // Online generator should produce power
      expect(generator.getCurrentOutput()).toBe(95.0); // 100 * 0.95

      // Offline generator should produce no power
      generator.stop();
      expect(generator.getCurrentOutput()).toBe(0);
    });
  });
});

// Helper function for path finding
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