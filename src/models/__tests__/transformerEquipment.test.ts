import EquipmentBase from '../equipmentBase';
import Transformer from '../transformerEquipment';
import type { EquipmentType } from '../../types/equipment.types';

describe('Transformer Equipment', () => {
  beforeEach(() => {
    EquipmentBase.clearRegistry();
  });

  afterEach(() => {
    EquipmentBase.clearRegistry();
  });

  describe('Transformer Creation', () => {
    test('should create Transformer with required properties', () => {
      const transformer = new Transformer('XFMR-01', 'Main Transformer', {
        primaryVoltage: 13.8,
        secondaryVoltage: 4.16,
        powerRating: 25.0,
        phaseCount: 3,
        connectionType: 'Delta',
        impedance: 5.75,
        isOperational: true
      });
      
      expect(transformer.id).toBe('XFMR-01');
      expect(transformer.name).toBe('Main Transformer');
      expect(transformer.type).toBe('Transformer');
      expect(transformer.primaryVoltage).toBe(13.8);
      expect(transformer.secondaryVoltage).toBe(4.16);
      expect(transformer.powerRating).toBe(25.0);
      expect(transformer.phaseCount).toBe(3);
      expect(transformer.connectionType).toBe('Delta');
      expect(transformer.impedance).toBe(5.75);
      expect(transformer.isOperational).toBe(true);
    });

    test('should set correct connection limits for Transformer', () => {
      const transformer = new Transformer('XFMR-01', 'Main Transformer', {
        primaryVoltage: 13.8,
        secondaryVoltage: 4.16,
        powerRating: 25.0,
        phaseCount: 3,
        connectionType: 'Delta',
        impedance: 5.75,
        isOperational: true
      });
      
      expect(transformer.allowedSources).toBe(1); // Transformers typically have one source
      expect(transformer.allowedLoads).toBe(1); // Transformers typically feed one load
    });

    test('should create Transformer with different connection types', () => {
      const deltaTransformer = new Transformer('XFMR-DELTA', 'Delta Transformer', {
        primaryVoltage: 13.8,
        secondaryVoltage: 4.16,
        powerRating: 25.0,
        phaseCount: 3,
        connectionType: 'Delta',
        impedance: 5.75,
        isOperational: true
      });

      const wyeTransformer = new Transformer('XFMR-WYE', 'Wye Transformer', {
        primaryVoltage: 13.8,
        secondaryVoltage: 4.16,
        powerRating: 25.0,
        phaseCount: 3,
        connectionType: 'Wye',
        impedance: 5.75,
        isOperational: true
      });
      
      expect(deltaTransformer.connectionType).toBe('Delta');
      expect(wyeTransformer.connectionType).toBe('Wye');
    });

    test('should create single-phase and three-phase transformers', () => {
      const singlePhase = new Transformer('XFMR-1PH', 'Single Phase Transformer', {
        primaryVoltage: 7.2,
        secondaryVoltage: 0.24,
        powerRating: 0.1,
        phaseCount: 1,
        connectionType: 'Delta',
        impedance: 3.5,
        isOperational: true
      });

      const threePhase = new Transformer('XFMR-3PH', 'Three Phase Transformer', {
        primaryVoltage: 13.8,
        secondaryVoltage: 4.16,
        powerRating: 25.0,
        phaseCount: 3,
        connectionType: 'Wye',
        impedance: 5.75,
        isOperational: true
      });
      
      expect(singlePhase.phaseCount).toBe(1);
      expect(threePhase.phaseCount).toBe(3);
    });
  });

  describe('Transformer Business Logic', () => {
    let transformer: Transformer;

    beforeEach(() => {
      transformer = new Transformer('XFMR-01', 'Main Transformer', {
        primaryVoltage: 13.8,
        secondaryVoltage: 4.16,
        powerRating: 25.0,
        phaseCount: 3,
        connectionType: 'Delta',
        impedance: 5.75,
        isOperational: true
      });
    });

    test('should start and stop transformer correctly', () => {
      transformer.stop();
      expect(transformer.isOperational).toBe(false);
      
      transformer.start();
      expect(transformer.isOperational).toBe(true);
    });

    test('should calculate turns ratio manually', () => {
      const turnsRatio = transformer.primaryVoltage / transformer.secondaryVoltage;
      expect(turnsRatio).toBeCloseTo(3.317, 3); // 13.8 / 4.16
    });

    test('should have reasonable impedance values', () => {
      expect(transformer.impedance).toBeGreaterThan(0);
      expect(transformer.impedance).toBeLessThan(20); // Typical range for transformers
    });

    test('should have valid voltage ratings', () => {
      expect(transformer.primaryVoltage).toBeGreaterThan(transformer.secondaryVoltage);
      expect(transformer.primaryVoltage).toBeGreaterThan(0);
      expect(transformer.secondaryVoltage).toBeGreaterThan(0);
    });

    test('should have valid power rating', () => {
      expect(transformer.powerRating).toBeGreaterThan(0);
    });

    test('should support both single and three phase configurations', () => {
      const singlePhaseTransformer = new Transformer('XFMR-1PH', 'Single Phase', {
        primaryVoltage: 7.2,
        secondaryVoltage: 0.24,
        powerRating: 0.1,
        phaseCount: 1,
        connectionType: 'Delta',
        impedance: 3.5,
        isOperational: true
      });

      expect(singlePhaseTransformer.phaseCount).toBe(1);
      expect(transformer.phaseCount).toBe(3);
    });
  });

  describe('Transformer Serialization', () => {
    test('should serialize Transformer to JSON', () => {
      const transformer = new Transformer('XFMR-01', 'Main Transformer', {
        primaryVoltage: 13.8,
        secondaryVoltage: 4.16,
        powerRating: 25.0,
        phaseCount: 3,
        connectionType: 'Delta',
        impedance: 5.75,
        isOperational: true
      });
      
      const jsonData = transformer.toJSON();
      
      expect(jsonData).toEqual({
        id: 'XFMR-01',
        name: 'Main Transformer',
        type: 'Transformer',
        sourceIds: [],
        loadIds: [],
        position: { x: 0, y: 0 },
        primaryVoltage: 13.8,
        secondaryVoltage: 4.16,
        powerRating: 25.0,
        phaseCount: 3,
        connectionType: 'Delta',
        impedance: 5.75,
        isOperational: true
      });
    });

    test('should deserialize Transformer from JSON', () => {
      const transformerData = {
        id: 'XFMR-01',
        name: 'Main Transformer',
        type: 'Transformer' as EquipmentType,
        sourceIds: [],
        loadIds: [],
        position: { x: 0, y: 0 },
        primaryVoltage: 13.8,
        secondaryVoltage: 4.16,
        powerRating: 25.0,
        phaseCount: 3 as const,
        connectionType: 'Delta' as const,
        impedance: 5.75,
        isOperational: true
      };
      
      const transformer = Transformer.fromJSON(transformerData);
      
      expect(transformer.id).toBe('XFMR-01');
      expect(transformer.name).toBe('Main Transformer');
      expect(transformer.type).toBe('Transformer');
      expect(transformer.primaryVoltage).toBe(13.8);
      expect(transformer.secondaryVoltage).toBe(4.16);
      expect(transformer.powerRating).toBe(25.0);
      expect(transformer.phaseCount).toBe(3);
      expect(transformer.connectionType).toBe('Delta');
      expect(transformer.impedance).toBe(5.75);
      expect(transformer.isOperational).toBe(true);
    });
  });

  describe('Transformer Input Properties Validation', () => {
    test('should have correct input property definitions', () => {
      expect(Transformer.inputProperties.primaryVoltage).toBeDefined();
      expect(Transformer.inputProperties.primaryVoltage.type).toBe('number');
      expect(Transformer.inputProperties.primaryVoltage.label).toBe('Primary Voltage (kV)');

      expect(Transformer.inputProperties.secondaryVoltage).toBeDefined();
      expect(Transformer.inputProperties.powerRating).toBeDefined();
      expect(Transformer.inputProperties.phaseCount).toBeDefined();
      expect(Transformer.inputProperties.connectionType).toBeDefined();
      expect(Transformer.inputProperties.impedance).toBeDefined();
    });

    test('should validate voltage inputs', () => {
      const primaryValidation = Transformer.inputProperties.primaryVoltage.validation;
      const secondaryValidation = Transformer.inputProperties.secondaryVoltage.validation;
      
      expect(primaryValidation).toBeDefined();
      expect(secondaryValidation).toBeDefined();
      
      if (primaryValidation) {
        expect(primaryValidation(0)).toBe('Primary voltage must be a positive number');
        expect(primaryValidation(-5)).toBe('Primary voltage must be a positive number');
        expect(primaryValidation(13.8)).toBeUndefined();
      }
      
      if (secondaryValidation) {
        expect(secondaryValidation(0)).toBe('Secondary voltage must be a positive number');
        expect(secondaryValidation(-5)).toBe('Secondary voltage must be a positive number');
        expect(secondaryValidation(4.16)).toBeUndefined();
      }
    });

    test('should validate phase count', () => {
      const phaseValidation = Transformer.inputProperties.phaseCount.validation;
      expect(phaseValidation).toBeDefined();
      
      if (phaseValidation) {
        expect(phaseValidation(2)).toBe('Phase count must be 1 or 3');
        expect(phaseValidation(4)).toBe('Phase count must be 1 or 3');
        expect(phaseValidation(1)).toBeUndefined();
        expect(phaseValidation(3)).toBeUndefined();
      }
    });
  });

  describe('Transformer Network Behavior', () => {
    let transformer: Transformer;
    let generator: EquipmentBase;
    let switchgear: EquipmentBase;

    beforeEach(() => {
      transformer = new Transformer('XFMR-01', 'Main Transformer', {
        primaryVoltage: 13.8,
        secondaryVoltage: 4.16,
        powerRating: 25.0,
        phaseCount: 3,
        connectionType: 'Delta',
        impedance: 5.75,
        isOperational: true
      });
      
      generator = new EquipmentBase('GEN-01', 'Main Generator', 'Generator' as EquipmentType);
      switchgear = new EquipmentBase('SWG-01', 'Main Switchgear', 'Switchgear' as EquipmentType);
    });

    test('should connect between generator and switchgear', () => {
      generator.addLoad(transformer);
      transformer.addLoad(switchgear);
      
      expect(transformer.sourceIds).toContain('GEN-01');
      expect(transformer.loadIds).toContain('SWG-01');
      expect(generator.loadIds).toContain('XFMR-01');
      expect(switchgear.sourceIds).toContain('XFMR-01');
    });

    test('should handle electrical isolation when non-operational', () => {
      generator.addLoad(transformer);
      transformer.addLoad(switchgear);
      
      transformer.isOperational = false;
      
      // Connections still exist but transformer is not operational
      expect(transformer.isConnectedTo(generator)).toBe(true);
      expect(transformer.isConnectedTo(switchgear)).toBe(true);
      expect(transformer.isOperational).toBe(false);
    });
  });
});
