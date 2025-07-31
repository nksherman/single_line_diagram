import EquipmentBase from '../../models/equipmentBase';
import Generator from '../../models/generatorEquipment';
import Transformer from '../../models/transformerEquipment';
import Bus from '../../models/busEquipment';
import Meter from '../../models/meterEquipment';
import { 
  getBaseEquipmentSize, 
  getTextGroups, 
  calculateEquipmentDimensions 
} from '../equipmentDimensions';

describe('Equipment Dimensions Utilities', () => {
  beforeEach(() => {
    EquipmentBase.clearRegistry();
  });

  afterEach(() => {
    EquipmentBase.clearRegistry();
  });

  describe('getBaseEquipmentSize', () => {
    test('should return correct base sizes for different equipment types', () => {
      expect(getBaseEquipmentSize('Generator')).toEqual({ width: 40, height: 40 });
      expect(getBaseEquipmentSize('Transformer')).toEqual({ width: 60, height: 40 });
      expect(getBaseEquipmentSize('Bus')).toEqual({ width: 60, height: 4 });
      expect(getBaseEquipmentSize('Meter')).toEqual({ width: 30, height: 30 });
      expect(getBaseEquipmentSize('Switchgear')).toEqual({ width: 40, height: 40 });
      expect(getBaseEquipmentSize('Breaker')).toEqual({ width: 30, height: 30 });
      expect(getBaseEquipmentSize('Load')).toEqual({ width: 30, height: 30 });
    });

    test('should return default size for unknown equipment types', () => {
      expect(getBaseEquipmentSize('UnknownType')).toEqual({ width: 40, height: 40 });
      expect(getBaseEquipmentSize('')).toEqual({ width: 40, height: 40 });
    });
  });

  describe('getTextGroups', () => {
    test('should generate text groups for Generator equipment', () => {
      const generator = new Generator('GEN-01', 'Main Generator', {
        capacity: 25.0,
        voltage: 13.8,
        fuelType: 'natural_gas',
        efficiency: 92.5,
        isOnline: true
      });

      const textGroups = getTextGroups(generator);
      
      expect(textGroups.topLeft).toBe('Main Generator');
      expect(textGroups.right).toContain('25MW');
      expect(textGroups.bottomRight).toBe('13.8kV');
    });

    test('should generate text groups for Transformer equipment', () => {
      const transformer = new Transformer('XFMR-01', 'Main Transformer', {
        primaryVoltage: 13.8,
        secondaryVoltage: 4.16,
        powerRating: 25.0,
        phaseCount: 3,
        connectionType: 'Delta',
        impedance: 5.75,
        isOperational: true
      });

      const textGroups = getTextGroups(transformer);
      
      expect(textGroups.topLeft).toBe('Main Transformer');
      expect(textGroups.left).toContain('25MVA');
      expect(textGroups.right).toContain('13.8kV');
      expect(textGroups.right).toContain('4.16kV');
    });

    test('should generate text groups for Bus equipment', () => {
      const bus = new Bus('BUS-01', 'Main Bus', {
        voltage: 13.8,
        width: 100
      });

      const textGroups = getTextGroups(bus);
      
      expect(textGroups.topLeft).toBe('Main Bus');
      expect(textGroups.topRight).toBe('13.8kV');
    });

    test('should generate basic text groups for other equipment types', () => {
      const meter = new Meter('MTR-01', 'Main Meter', {
        voltageRating: 13.8,
        currentRating: 1000,
        accuracyClass: '0.5',
        isOperational: true
      });

      const textGroups = getTextGroups(meter);
      
      expect(textGroups.topLeft).toBe('Main Meter');
      expect(textGroups.left).toEqual([]);
      expect(textGroups.right).toContain('1000A');
      expect(textGroups.right).toContain('13.8kV');
    });

    test('should handle equipment with empty or minimal data', () => {
      const basicEquipment = new EquipmentBase('EQ-01', 'Basic Equipment', 'Other');

      const textGroups = getTextGroups(basicEquipment);
      
      expect(textGroups.topLeft).toBe('Basic Equipment');
      expect(textGroups.left).toEqual([]);
      expect(textGroups.right).toEqual([]);
    });
  });

  describe('calculateEquipmentDimensions', () => {
    test('should calculate dimensions for Generator equipment', () => {
      const generator = new Generator('GEN-01', 'Main Generator', {
        capacity: 25.0,
        voltage: 13.8,
        fuelType: 'natural_gas',
        efficiency: 92.5,
        isOnline: true
      });

      const dimensions = calculateEquipmentDimensions(generator);
      
      expect(dimensions.width).toBeGreaterThan(40); // Should be wider than base size due to text
      expect(dimensions.height).toBe(40); // Height should match base size
      expect(typeof dimensions.width).toBe('number');
      expect(typeof dimensions.height).toBe('number');
    });

    test('should use stored width for Bus equipment', () => {
      const customWidth = 150;
      const bus = new Bus('BUS-01', 'Main Bus', {
        voltage: 13.8,
        width: customWidth
      });

      const dimensions = calculateEquipmentDimensions(bus);
      
      expect(dimensions.width).toBe(customWidth);
      expect(dimensions.height).toBe(4); // Bus height
    });

    test('should calculate dimensions for Transformer equipment', () => {
      const transformer = new Transformer('XFMR-01', 'Main Transformer', {
        primaryVoltage: 13.8,
        secondaryVoltage: 4.16,
        powerRating: 25.0,
        phaseCount: 3,
        connectionType: 'Delta',
        impedance: 5.75,
        isOperational: true
      });

      const dimensions = calculateEquipmentDimensions(transformer);
      
      expect(dimensions.width).toBeGreaterThan(60); // Should be wider than base size due to text
      expect(dimensions.height).toBe(40);
    });

    test('should handle equipment with long names', () => {
      const generator = new Generator('GEN-01', 'Very Long Generator Name That Should Affect Width Calculation', {
        capacity: 25.0,
        voltage: 13.8,
        fuelType: 'natural_gas',
        efficiency: 92.5,
        isOnline: true
      });

      const dimensions = calculateEquipmentDimensions(generator);
      
      expect(dimensions.width).toBeGreaterThan(100); // Should be significantly wider due to long name
      expect(dimensions.height).toBe(40);
    });

    test('should enforce minimum width', () => {
      const meter = new Meter('MTR-01', 'M', { // Very short name
        voltageRating: 13.8,
        currentRating: 100,
        accuracyClass: '0.5',
        isOperational: true
      });

      const dimensions = calculateEquipmentDimensions(meter);
      
      expect(dimensions.width).toBeGreaterThanOrEqual(40); // Should enforce minimum width
      expect(dimensions.height).toBe(30);
    });

    test('should return consistent dimensions for same equipment', () => {
      const bus = new Bus('BUS-01', 'Test Bus', {
        voltage: 13.8,
        width: 100
      });

      const dimensions1 = calculateEquipmentDimensions(bus);
      const dimensions2 = calculateEquipmentDimensions(bus);
      
      expect(dimensions1).toEqual(dimensions2);
    });

    test('should handle different Bus widths correctly', () => {
      const narrowBus = new Bus('BUS-NARROW', 'Narrow Bus', {
        voltage: 13.8,
        width: 40
      });

      const wideBus = new Bus('BUS-WIDE', 'Wide Bus', {
        voltage: 13.8,
        width: 200
      });

      const narrowDimensions = calculateEquipmentDimensions(narrowBus);
      const wideDimensions = calculateEquipmentDimensions(wideBus);
      
      expect(narrowDimensions.width).toBe(40);
      expect(wideDimensions.width).toBe(200);
      expect(narrowDimensions.height).toBe(wideDimensions.height); // Same height
    });
  });

  describe('Text width estimation', () => {
    test('should calculate wider dimensions for equipment with more text content', () => {
      const simpleGenerator = new Generator('GEN-SIMPLE', 'G1', {
        capacity: 5.0,
        voltage: 4.0,
        fuelType: 'wind',
        efficiency: 90.0,
        isOnline: true
      });

      const complexGenerator = new Generator('GEN-COMPLEX', 'Complex Generator Name', {
        capacity: 999.0,
        voltage: 138.0,
        fuelType: 'natural_gas',
        efficiency: 95.5,
        isOnline: true
      });

      const simpleDimensions = calculateEquipmentDimensions(simpleGenerator);
      const complexDimensions = calculateEquipmentDimensions(complexGenerator);
      
      expect(complexDimensions.width).toBeGreaterThan(simpleDimensions.width);
    });
  });
});
