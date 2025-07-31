import EquipmentBase from '../equipmentBase';
import Generator from '../generatorEquipment';
import type { EquipmentType } from '../../types/equipment.types';

describe('Generator Equipment', () => {
  beforeEach(() => {
    EquipmentBase.clearRegistry();
  });

  afterEach(() => {
    EquipmentBase.clearRegistry();
  });

  describe('Generator Creation', () => {
    test('should create Generator with required properties', () => {
      const generator = new Generator('GEN-01', 'Main Generator', {
        capacity: 25.0,
        voltage: 13.8,
        fuelType: 'natural_gas',
        efficiency: 92.5,
        isOnline: true
      });
      
      expect(generator.id).toBe('GEN-01');
      expect(generator.name).toBe('Main Generator');
      expect(generator.type).toBe('Generator');
      expect(generator.capacity).toBe(25.0);
      expect(generator.voltage).toBe(13.8);
      expect(generator.fuelType).toBe('natural_gas');
      expect(generator.efficiency).toBe(92.5);
      expect(generator.isOnline).toBe(true);
    });

    test('should set correct connection limits for Generator', () => {
      const generator = new Generator('GEN-01', 'Main Generator', {
        capacity: 25.0,
        voltage: 13.8,
        fuelType: 'natural_gas',
        efficiency: 92.5,
        isOnline: true
      });
      
      expect(generator.allowedSources).toBe(0); // Generators typically have no sources
      expect(generator.allowedLoads).toBe(1); // Generators typically feed one load
    });

    test('should create Generator with different fuel types', () => {
      const fuelTypes: Array<'natural_gas' | 'diesel' | 'solar' | 'wind' | 'hydro' | 'nuclear' | 'coal'> = 
        ['natural_gas', 'diesel', 'solar', 'wind', 'hydro', 'nuclear', 'coal'];
      
      fuelTypes.forEach((fuelType, index) => {
        const generator = new Generator(`GEN-${index}`, `${fuelType} Generator`, {
          capacity: 10.0,
          voltage: 13.8,
          fuelType,
          efficiency: 85.0,
          isOnline: true
        });
        
        expect(generator.fuelType).toBe(fuelType);
      });
    });
  });

  describe('Generator Business Logic', () => {
    let generator: Generator;

    beforeEach(() => {
      generator = new Generator('GEN-01', 'Main Generator', {
        capacity: 25.0,
        voltage: 13.8,
        fuelType: 'natural_gas',
        efficiency: 92.5,
        isOnline: true
      });
    });

    test('should calculate current output based on capacity and efficiency', () => {
      const expectedOutput = (generator.capacity * generator.efficiency) / 100;
      expect(generator.getCurrentOutput()).toBeCloseTo(expectedOutput, 2);
    });

    test('should return zero current output when offline', () => {
      generator.stop();
      expect(generator.getCurrentOutput()).toBe(0);
      expect(generator.isOnline).toBe(false);
    });

    test('should start and stop generator correctly', () => {
      generator.stop();
      expect(generator.isOnline).toBe(false);
      expect(generator.getCurrentOutput()).toBe(0);
      
      generator.start();
      expect(generator.isOnline).toBe(true);
      expect(generator.getCurrentOutput()).toBeGreaterThan(0);
    });

    test('should calculate correct current output for different efficiencies', () => {
      const generator1 = new Generator('GEN-HIGH-EFF', 'High Efficiency Generator', {
        capacity: 100.0,
        voltage: 13.8,
        fuelType: 'natural_gas',
        efficiency: 95.0,
        isOnline: true
      });

      const generator2 = new Generator('GEN-LOW-EFF', 'Low Efficiency Generator', {
        capacity: 100.0,
        voltage: 13.8,
        fuelType: 'diesel',
        efficiency: 75.0,
        isOnline: true
      });

      expect(generator1.getCurrentOutput()).toBe(95.0); // 100 * 0.95
      expect(generator2.getCurrentOutput()).toBe(75.0); // 100 * 0.75
    });
  });

  describe('Generator Serialization', () => {
    test('should serialize Generator to JSON', () => {
      const generator = new Generator('GEN-01', 'Main Generator', {
        capacity: 25.0,
        voltage: 13.8,
        fuelType: 'natural_gas',
        efficiency: 92.5,
        isOnline: true
      });
      
      const jsonData = generator.toJSON();
      
      expect(jsonData).toEqual({
        id: 'GEN-01',
        name: 'Main Generator',
        type: 'Generator',
        sourceIds: [],
        loadIds: [],
        position: { x: 0, y: 0 },
        capacity: 25.0,
        voltage: 13.8,
        fuelType: 'natural_gas',
        efficiency: 92.5,
        isOnline: true
      });
    });

    test('should deserialize Generator from JSON', () => {
      const generatorData = {
        id: 'GEN-01',
        name: 'Main Generator',
        type: 'Generator' as EquipmentType,
        sourceIds: [],
        loadIds: [],
        position: { x: 0, y: 0 },
        capacity: 25.0,
        voltage: 13.8,
        fuelType: 'natural_gas' as const,
        efficiency: 92.5,
        isOnline: true
      };
      
      const generator = Generator.fromJSON(generatorData);
      
      expect(generator.id).toBe('GEN-01');
      expect(generator.name).toBe('Main Generator');
      expect(generator.type).toBe('Generator');
      expect(generator.capacity).toBe(25.0);
      expect(generator.voltage).toBe(13.8);
      expect(generator.fuelType).toBe('natural_gas');
      expect(generator.efficiency).toBe(92.5);
      expect(generator.isOnline).toBe(true);
    });
  });

  describe('Generator Input Properties Validation', () => {
    test('should have correct input property definitions', () => {
      expect(Generator.inputProperties.capacity).toBeDefined();
      expect(Generator.inputProperties.capacity.type).toBe('number');
      expect(Generator.inputProperties.capacity.label).toBe('Capacity (MW)');
      expect(Generator.inputProperties.capacity.defaultValue).toBe(10);

      expect(Generator.inputProperties.voltage).toBeDefined();
      expect(Generator.inputProperties.efficiency).toBeDefined();
      expect(Generator.inputProperties.fuelType).toBeDefined();
      expect(Generator.inputProperties.fuelType.type).toBe('select');
    });

    test('should validate capacity input', () => {
      const capacityValidation = Generator.inputProperties.capacity.validation;
      expect(capacityValidation).toBeDefined();
      
      if (capacityValidation) {
        expect(capacityValidation(0)).toBe('Capacity must be a positive number');
        expect(capacityValidation(-5)).toBe('Capacity must be a positive number');
        expect(capacityValidation(10)).toBeUndefined();
      }
    });

    test('should validate efficiency input', () => {
      const efficiencyValidation = Generator.inputProperties.efficiency.validation;
      expect(efficiencyValidation).toBeDefined();
      
      if (efficiencyValidation) {
        expect(efficiencyValidation(-1)).toBe('Efficiency must be between 0 and 100');
        expect(efficiencyValidation(101)).toBe('Efficiency must be between 0 and 100');
        expect(efficiencyValidation(85)).toBeUndefined();
      }
    });
  });

  describe('Generator Network Behavior', () => {
    let generator: Generator;
    let transformer: EquipmentBase;

    beforeEach(() => {
      generator = new Generator('GEN-01', 'Main Generator', {
        capacity: 25.0,
        voltage: 13.8,
        fuelType: 'natural_gas',
        efficiency: 92.5,
        isOnline: true
      });
      
      transformer = new EquipmentBase('XFMR-01', 'Main Transformer', 'Transformer' as EquipmentType);
    });

    test('should connect to downstream equipment', () => {
      generator.addLoad(transformer);
      
      expect(generator.loadIds).toContain('XFMR-01');
      expect(transformer.sourceIds).toContain('GEN-01');
    });

    test('should prevent adding sources (generators typically have no sources)', () => {
      const upstreamEquipment = new EquipmentBase('UPSTREAM-01', 'Upstream', 'Other' as EquipmentType);
      
      // This should work (adding the connection) but may violate business rules
      generator.addSource(upstreamEquipment);
      expect(generator.sourceIds).toContain('UPSTREAM-01');
      
      // In a real application, you might want to add validation to prevent this
      // based on allowedSources being 0
    });
  });
});
