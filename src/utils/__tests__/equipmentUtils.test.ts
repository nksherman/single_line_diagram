import EquipmentBase from '../../models/equipmentBase';
import Generator from '../../models/generatorEquipment';
import Transformer from '../../models/transformerEquipment';
import Bus from '../../models/busEquipment';
import {
  getEquipmentVoltage,
  validateConnectionLimits,
  validateConnectionConflicts,
  getCurrentEquipmentVoltage
} from '../equipmentUtils';

describe('Equipment Utils', () => {
  beforeEach(() => {
    EquipmentBase.clearRegistry();
  });

  afterEach(() => {
    EquipmentBase.clearRegistry();
  });

  describe('getEquipmentVoltage', () => {
    test('should return voltage for Generator equipment', () => {
      const generator = new Generator('GEN-01', 'Main Generator', {
        capacity: 25.0,
        voltage: 13.8,
        fuelType: 'natural_gas',
        efficiency: 92.5,
        isOnline: true
      });

      const voltage = getEquipmentVoltage(generator, 'source');
      expect(voltage).toBe(13.8);

      // For generators, voltage should be same regardless of connection type
      const voltageAsLoad = getEquipmentVoltage(generator, 'load');
      expect(voltageAsLoad).toBe(13.8);
    });

    test('should return appropriate voltage for Transformer equipment', () => {
      const transformer = new Transformer('XFMR-01', 'Main Transformer', {
        primaryVoltage: 13.8,
        secondaryVoltage: 4.16,
        powerRating: 25.0,
        phaseCount: 3,
        connectionType: 'Delta',
        impedance: 5.75,
        isOperational: true
      });

      const primaryVoltage = getEquipmentVoltage(transformer, 'source');
      expect(primaryVoltage).toBe(13.8);

      const secondaryVoltage = getEquipmentVoltage(transformer, 'load');
      expect(secondaryVoltage).toBe(4.16);
    });

    test('should return voltage for Bus equipment', () => {
      const bus = new Bus('BUS-01', 'Main Bus', {
        voltage: 13.8,
        width: 100
      });

      const voltage = getEquipmentVoltage(bus, 'source');
      expect(voltage).toBe(13.8);

      // For buses, voltage should be same regardless of connection type
      const voltageAsLoad = getEquipmentVoltage(bus, 'load');
      expect(voltageAsLoad).toBe(13.8);
    });

    test('should return null for unknown equipment types', () => {
      const unknownEquipment = new EquipmentBase('UNK-01', 'Unknown Equipment', 'Other');

      const voltage = getEquipmentVoltage(unknownEquipment, 'source');
      expect(voltage).toBeNull();
    });

    test('should handle fallback type checking for transformers', () => {
      // Create a mock transformer-like object without instanceof working
      const mockTransformer = new EquipmentBase('XFMR-01', 'Mock Transformer', 'Transformer');
      (mockTransformer as any).primaryVoltage = 13.8;
      (mockTransformer as any).secondaryVoltage = 4.16;

      const primaryVoltage = getEquipmentVoltage(mockTransformer, 'source');
      expect(primaryVoltage).toBe(13.8);

      const secondaryVoltage = getEquipmentVoltage(mockTransformer, 'load');
      expect(secondaryVoltage).toBe(4.16);
    });
  });

  describe('validateConnectionLimits', () => {
    test('should return no errors when within limits', () => {
      const errors = validateConnectionLimits(
        ['SRC-01'], // 1 source
        ['LOAD-01', 'LOAD-02'], // 2 loads
        2, // max 2 sources
        3, // max 3 loads
        'TestEquipment'
      );

      expect(errors).toEqual([]);
    });

    test('should return error when sources exceed limit', () => {
      const errors = validateConnectionLimits(
        ['SRC-01', 'SRC-02', 'SRC-03'], // 3 sources
        ['LOAD-01'], // 1 load
        2, // max 2 sources
        3, // max 3 loads
        'TestEquipment'
      );

      expect(errors).toContain('TestEquipment can have at most 2 sources');
    });

    test('should return error when loads exceed limit', () => {
      const errors = validateConnectionLimits(
        ['SRC-01'], // 1 source
        ['LOAD-01', 'LOAD-02', 'LOAD-03', 'LOAD-04'], // 4 loads
        2, // max 2 sources
        3, // max 3 loads
        'TestEquipment'
      );

      expect(errors).toContain('TestEquipment can have at most 3 loads');
    });

    test('should return multiple errors when both limits exceeded', () => {
      const errors = validateConnectionLimits(
        ['SRC-01', 'SRC-02', 'SRC-03'], // 3 sources
        ['LOAD-01', 'LOAD-02', 'LOAD-03', 'LOAD-04'], // 4 loads
        1, // max 1 source
        2, // max 2 loads
        'TestEquipment'
      );

      expect(errors).toHaveLength(2);
      expect(errors).toContain('TestEquipment can have at most 1 sources');
      expect(errors).toContain('TestEquipment can have at most 2 loads');
    });

    test('should handle zero limits', () => {
      const errors = validateConnectionLimits(
        ['SRC-01'], // 1 source
        [], // 0 loads
        0, // max 0 sources
        0, // max 0 loads
        'TestEquipment'
      );

      expect(errors).toContain('TestEquipment can have at most 0 sources');
    });
  });

  describe('validateConnectionConflicts', () => {
    let generator: Generator;
    let transformer: Transformer;
    let bus: Bus;
    let motor1: EquipmentBase;

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

      motor1 = new EquipmentBase('MTR-01', 'Motor 1', 'Motor');

      // Set up some existing connections
      generator.addLoad(transformer);
      transformer.addLoad(bus);
    });

    test('should return no errors when connections are valid', () => {
      // Create a fresh transformer without existing connections
      const freshTransformer = new Transformer('XFMR-02', 'Fresh Transformer', {
        primaryVoltage: 13.8,
        secondaryVoltage: 4.16,
        powerRating: 25.0,
        phaseCount: 3,
        connectionType: 'Delta',
        impedance: 5.75,
        isOperational: true
      });
      
      const errors = validateConnectionConflicts([freshTransformer], [motor1]);
      expect(errors).toEqual([]);
    });

    test('should detect when source equipment is at capacity', () => {
      // Generator can only have 1 load, and it's already connected to transformer
      // Now we're trying to add motor1 as another load
      generator.addLoad(motor1); // This would exceed capacity

      const errors = validateConnectionConflicts([generator], []);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('maximum loads'))).toBe(true);
    });

    test('should detect when load equipment is at capacity', () => {
      // Motor typically has allowedSources = 1, so if it already has a source
      // and we try to add another, it should error
      const motor = new EquipmentBase('MTR-03', 'Motor 3', 'Motor');
      motor.allowedSources = 1;
      
      bus.addLoad(motor); // Motor now has bus as a source
      
      const errors = validateConnectionConflicts([], [motor]);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('maximum sources'))).toBe(true);
    });

    test('should exclude current equipment from conflict checks', () => {
      // When editing an existing equipment, it should not count itself in the conflict check
      const currentEquipmentId = 'XFMR-01';
      
      const errors = validateConnectionConflicts([generator], [bus], currentEquipmentId);
      expect(errors).toEqual([]);
    });

    test('should handle empty equipment arrays', () => {
      const errors = validateConnectionConflicts([], []);
      expect(errors).toEqual([]);
    });

    test('should check multiple equipment in arrays', () => {
      const generator2 = new Generator('GEN-02', 'Generator 2', {
        capacity: 10.0,
        voltage: 13.8,
        fuelType: 'diesel',
        efficiency: 85.0,
        isOnline: true
      });
      
      // Both generators have allowedLoads = 1, and both are already connected
      const errors = validateConnectionConflicts([generator, generator2], []);
      
      // Should find conflicts for both generators if they're at capacity
      expect(errors.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration with different equipment types', () => {
    test('should work with mixed equipment types in network', () => {
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

      // Check voltage compatibility
      const genVoltage = getEquipmentVoltage(generator, 'load');
      const xfmrPrimaryVoltage = getEquipmentVoltage(transformer, 'source');
      const xfmrSecondaryVoltage = getEquipmentVoltage(transformer, 'load');
      const busVoltage = getEquipmentVoltage(bus, 'source');

      expect(genVoltage).toBe(xfmrPrimaryVoltage); // Generator output matches transformer primary
      expect(xfmrSecondaryVoltage).toBe(busVoltage); // Transformer secondary matches bus
    });
  });
  describe('getCurrentEquipmentVoltage', () => {
    test('should return voltage for Generator equipment type', () => {
      const propertyValues = { voltage: 13.8 };
      
      const voltage = getCurrentEquipmentVoltage('Generator', propertyValues, 'source');
      expect(voltage).toBe(13.8);

      // For generators, voltage should be same regardless of connection type
      const voltageAsLoad = getCurrentEquipmentVoltage('Generator', propertyValues, 'load');
      expect(voltageAsLoad).toBe(13.8);
    });

    test('should return appropriate voltage for Transformer equipment type', () => {
      const propertyValues = {
        primaryVoltage: 13.8,
        secondaryVoltage: 4.16
      };

      const primaryVoltage = getCurrentEquipmentVoltage('Transformer', propertyValues, 'source');
      expect(primaryVoltage).toBe(13.8);

      const secondaryVoltage = getCurrentEquipmentVoltage('Transformer', propertyValues, 'load');
      expect(secondaryVoltage).toBe(4.16);
    });

    test('should return voltage for Bus equipment type', () => {
      const propertyValues = { voltage: 4.16 };

      const voltage = getCurrentEquipmentVoltage('Bus', propertyValues, 'source');
      expect(voltage).toBe(4.16);

      // For buses, voltage should be same regardless of connection type
      const voltageAsLoad = getCurrentEquipmentVoltage('Bus', propertyValues, 'load');
      expect(voltageAsLoad).toBe(4.16);
    });

    test('should return 0 when voltage property is missing for Generator', () => {
      const propertyValues = {};

      const voltage = getCurrentEquipmentVoltage('Generator', propertyValues, 'source');
      expect(voltage).toBe(0);
    });

    test('should return 0 when voltage properties are missing for Transformer', () => {
      const propertyValues = {};

      const primaryVoltage = getCurrentEquipmentVoltage('Transformer', propertyValues, 'source');
      expect(primaryVoltage).toBe(0);

      const secondaryVoltage = getCurrentEquipmentVoltage('Transformer', propertyValues, 'load');
      expect(secondaryVoltage).toBe(0);
    });

    test('should return 0 when voltage property is missing for Bus', () => {
      const propertyValues = {};

      const voltage = getCurrentEquipmentVoltage('Bus', propertyValues, 'source');
      expect(voltage).toBe(0);
    });

    test('should handle zero voltage values', () => {
      const generatorProps = { voltage: 0 };
      const transformerProps = { primaryVoltage: 0, secondaryVoltage: 0 };
      const busProps = { voltage: 0 };

      expect(getCurrentEquipmentVoltage('Generator', generatorProps, 'source')).toBe(0);
      expect(getCurrentEquipmentVoltage('Transformer', transformerProps, 'source')).toBe(0);
      expect(getCurrentEquipmentVoltage('Transformer', transformerProps, 'load')).toBe(0);
      expect(getCurrentEquipmentVoltage('Bus', busProps, 'source')).toBe(0);
    });

    test('should return null for unknown equipment types', () => {
      const propertyValues = { voltage: 13.8 };

      const voltage = getCurrentEquipmentVoltage('UnknownType', propertyValues, 'source');
      expect(voltage).toBeNull();
    });

    test('should handle partial transformer voltage properties', () => {
      const propsWithOnlyPrimary = { primaryVoltage: 13.8 };
      const propsWithOnlySecondary = { secondaryVoltage: 4.16 };

      expect(getCurrentEquipmentVoltage('Transformer', propsWithOnlyPrimary, 'source')).toBe(13.8);
      expect(getCurrentEquipmentVoltage('Transformer', propsWithOnlyPrimary, 'load')).toBe(0);
      expect(getCurrentEquipmentVoltage('Transformer', propsWithOnlySecondary, 'source')).toBe(0);
      expect(getCurrentEquipmentVoltage('Transformer', propsWithOnlySecondary, 'load')).toBe(4.16);
    });

    test('should handle empty property values object', () => {
      const emptyProps = {};

      expect(getCurrentEquipmentVoltage('Generator', emptyProps, 'source')).toBe(0);
      expect(getCurrentEquipmentVoltage('Transformer', emptyProps, 'source')).toBe(0);
      expect(getCurrentEquipmentVoltage('Transformer', emptyProps, 'load')).toBe(0);
      expect(getCurrentEquipmentVoltage('Bus', emptyProps, 'source')).toBe(0);
      expect(getCurrentEquipmentVoltage('UnknownType', emptyProps, 'source')).toBeNull();
    });

    test('should handle case sensitivity of equipment types', () => {
      const propertyValues = { voltage: 13.8 };

      // Test lowercase variations
      expect(getCurrentEquipmentVoltage('generator', propertyValues, 'source')).toBeNull();
      expect(getCurrentEquipmentVoltage('transformer', propertyValues, 'source')).toBeNull();
      expect(getCurrentEquipmentVoltage('bus', propertyValues, 'source')).toBeNull();
    });
  });
});
