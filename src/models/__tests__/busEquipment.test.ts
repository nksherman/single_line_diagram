import EquipmentBase from '../equipmentBase';
import Bus from '../busEquipment';
import { calculateEquipmentDimensions } from '../../utils/equipmentDimensions';
import type { EquipmentType } from '../../types/equipment.types';

describe('Bus Equipment', () => {
  beforeEach(() => {
    EquipmentBase.clearRegistry();
  });

  afterEach(() => {
    EquipmentBase.clearRegistry();
  });

  describe('Bus Creation', () => {
    test('should create Bus with required properties', () => {
      const bus = new Bus('BUS-01', 'Main Bus', {
        voltage: 13.8
      });
      
      expect(bus.id).toBe('BUS-01');
      expect(bus.name).toBe('Main Bus');
      expect(bus.type).toBe('Bus');
      expect(bus.voltage).toBe(13.8);
      expect(bus.width).toBe(Bus.defaultWidth);
    });

    test('should set correct connection limits for Bus', () => {
      const bus = new Bus('BUS-01', 'Main Bus', {
        voltage: 13.8
      });
      
      expect(bus.allowedSources).toBe(1); // Default for Bus
      expect(bus.allowedLoads).toBe(16); // Default for Bus
    });

    test('should create Bus with custom connection limits', () => {
      const bus = new Bus('BUS-01', 'Main Bus', {
        voltage: 13.8,
        allowedSources: 2,
        allowedLoads: 8
      });
      
      expect(bus.allowedSources).toBe(2);
      expect(bus.allowedLoads).toBe(8);
    });
  });

  describe('Bus Width Functionality', () => {
    test('should create Bus with default width', () => {
      const bus = new Bus('BUS-01', 'Main Bus', {
        voltage: 13.8
      });
      
      expect(bus.width).toBe(Bus.defaultWidth);
      expect(bus.width).toBe(60); // default width
    });

    test('should create Bus with custom width', () => {
      const customWidth = 120;
      const bus = new Bus('BUS-01', 'Main Bus', {
        voltage: 13.8,
        width: customWidth
      });
      
      expect(bus.width).toBe(customWidth);
    });

    test('should update Bus width dynamically', () => {
      const bus = new Bus('BUS-01', 'Main Bus', {
        voltage: 13.8
      });
      
      const newWidth = 150;
      bus.width = newWidth;
      
      expect(bus.width).toBe(newWidth);
    });

    test('should handle different width values', () => {
      const widths = [30, 60, 100, 200, 500];
      
      widths.forEach((width, index) => {
        const bus = new Bus(`BUS-${index}`, `Bus ${index}`, {
          voltage: 13.8,
          width: width
        });
        
        expect(bus.width).toBe(width);
      });
    });
  });

  describe('Bus Serialization', () => {
    test('should serialize and deserialize Bus with width', () => {
      const originalBus = new Bus('BUS-01', 'Main Bus', {
        voltage: 13.8,
        width: 100
      });
      
      const serialized = originalBus.toJSON();
      expect(serialized.width).toBe(100);
      expect(serialized.voltage).toBe(13.8);
      
      // Clear registry to simulate fresh state
      EquipmentBase.clearRegistry();
      
      const deserializedBus = Bus.fromJSON(serialized);
      expect(deserializedBus.width).toBe(100);
      expect(deserializedBus.voltage).toBe(13.8);
      expect(deserializedBus.name).toBe('Main Bus');
    });

    test('should handle missing width in JSON', () => {
      const busData = {
        id: 'BUS-01',
        name: 'Main Bus',
        type: 'Bus' as EquipmentType,
        sourceIds: [],
        loadIds: [],
        position: { x: 0, y: 0 },
        voltage: 13.8
        // width is missing
      };
      
      const bus = Bus.fromJSON(busData);
      expect(bus.width).toBe(Bus.defaultWidth);
      expect(bus.voltage).toBe(13.8);
    });

    test('should preserve connections during serialization', () => {
      const bus = new Bus('BUS-01', 'Main Bus', {
        voltage: 13.8,
        width: 100
      });
      
      const generator = new EquipmentBase('GEN-01', 'Generator', 'Generator' as EquipmentType);
      const motor = new EquipmentBase('MTR-01', 'Motor', 'Motor' as EquipmentType);
      
      generator.addLoad(bus);
      bus.addLoad(motor);
      
      const serialized = bus.toJSON();
      expect(serialized.sourceIds).toContain('GEN-01');
      expect(serialized.loadIds).toContain('MTR-01');
      
      EquipmentBase.clearRegistry();
      
      // Recreate all equipment
      EquipmentBase.fromJSON(generator.toJSON());
      EquipmentBase.fromJSON(motor.toJSON());
      const recreatedBus = Bus.fromJSON(serialized);
      
      // Rebuild connections
      EquipmentBase.rebuildConnections([
        generator.toJSON(),
        serialized,
        motor.toJSON()
      ]);
      
      expect(recreatedBus.sourceIds).toContain('GEN-01');
      expect(recreatedBus.loadIds).toContain('MTR-01');
    });
  });

  describe('Bus Input Properties', () => {
    test('should have correct input property definitions', () => {
      expect(Bus.inputProperties.voltage).toBeDefined();
      expect(Bus.inputProperties.voltage.type).toBe('number');
      expect(Bus.inputProperties.voltage.label).toBe('Voltage (kV)');

      expect(Bus.inputProperties.width).toBeDefined();
      expect(Bus.inputProperties.width.type).toBe('number');
      expect(Bus.inputProperties.width.label).toBe('Width (px)');
      expect(Bus.inputProperties.width.defaultValue).toBe(60);
    });

    test('should validate voltage input', () => {
      const voltageValidation = Bus.inputProperties.voltage.validation;
      expect(voltageValidation).toBeDefined();
      
      if (voltageValidation) {
        expect(voltageValidation(0)).toBe('Voltage must be a positive number');
        expect(voltageValidation(-5)).toBe('Voltage must be a positive number');
        expect(voltageValidation(13.8)).toBeUndefined();
      }
    });

    test('should validate width input', () => {
      const widthValidation = Bus.inputProperties.width.validation;
      expect(widthValidation).toBeDefined();
      
      if (widthValidation) {
        expect(widthValidation(10)).toBe('Width must be at least 20 pixels');
        expect(widthValidation(0)).toBe('Width must be at least 20 pixels');
        expect(widthValidation(100)).toBeUndefined();
      }
    });
  });

  describe('Bus Dimension Integration', () => {
    test('should use Bus stored width in dimension calculation', () => {
      const customWidth = 120;
      const bus = new Bus('BUS-01', 'Main Bus', {
        voltage: 13.8,
        width: customWidth
      });
      
      const dimensions = calculateEquipmentDimensions(bus);
      expect(dimensions.width).toBe(customWidth);
      expect(dimensions.height).toBe(4); // Bus default height
    });

    test('should update dimensions when Bus width changes', () => {
      const bus = new Bus('BUS-01', 'Main Bus', {
        voltage: 13.8,
        width: 60
      });
      
      let dimensions = calculateEquipmentDimensions(bus);
      expect(dimensions.width).toBe(60);
      
      bus.width = 150;
      dimensions = calculateEquipmentDimensions(bus);
      expect(dimensions.width).toBe(150);
    });

    test('should maintain consistent height regardless of width', () => {
      const widths = [30, 100, 200, 500];
      
      widths.forEach(width => {
        const bus = new Bus(`BUS-${width}`, `Bus ${width}`, {
          voltage: 13.8,
          width: width
        });
        
        const dimensions = calculateEquipmentDimensions(bus);
        expect(dimensions.width).toBe(width);
        expect(dimensions.height).toBe(4); // Should always be 4 for buses
      });
    });
  });

  describe('Bus Network Behavior', () => {
    let bus: Bus;
    let generator: EquipmentBase;
    let transformer: EquipmentBase;
    let motor1: EquipmentBase;
    let motor2: EquipmentBase;

    beforeEach(() => {
      bus = new Bus('BUS-01', 'Main Bus', {
        voltage: 4.16,
        width: 100
      });
      
      generator = new EquipmentBase('GEN-01', 'Generator', 'Generator' as EquipmentType);
      transformer = new EquipmentBase('XFMR-01', 'Transformer', 'Transformer' as EquipmentType);
      motor1 = new EquipmentBase('MTR-01', 'Motor 1', 'Motor' as EquipmentType);
      motor2 = new EquipmentBase('MTR-02', 'Motor 2', 'Motor' as EquipmentType);
    });

    test('should act as distribution point with multiple loads', () => {
      transformer.addLoad(bus);
      bus.addLoad(motor1);
      bus.addLoad(motor2);
      
      expect(bus.sourceIds).toEqual(['XFMR-01']);
      expect(bus.loadIds).toContain('MTR-01');
      expect(bus.loadIds).toContain('MTR-02');
      expect(motor1.sourceIds).toEqual(['BUS-01']);
      expect(motor2.sourceIds).toEqual(['BUS-01']);
    });

    test('should handle high connection capacity', () => {
      const motors: EquipmentBase[] = [];
      
      // Create multiple motors (within the allowed load limit of 16)
      for (let i = 1; i <= 10; i++) {
        const motor = new EquipmentBase(`MTR-${i}`, `Motor ${i}`, 'Motor' as EquipmentType);
        motors.push(motor);
        bus.addLoad(motor);
      }
      
      expect(bus.loadIds).toHaveLength(10);
      motors.forEach(motor => {
        expect(motor.sourceIds).toContain('BUS-01');
      });
    });

    test('should connect to upstream and downstream equipment in power flow', () => {
      // Typical power flow: Generator -> Transformer -> Bus -> Motors
      generator.addLoad(transformer);
      transformer.addLoad(bus);
      bus.addLoad(motor1);
      bus.addLoad(motor2);
      
      // Verify the complete power flow path
      expect(generator.loadIds).toEqual(['XFMR-01']);
      expect(transformer.sourceIds).toEqual(['GEN-01']);
      expect(transformer.loadIds).toEqual(['BUS-01']);
      expect(bus.sourceIds).toEqual(['XFMR-01']);
      expect(bus.loadIds).toContain('MTR-01');
      expect(bus.loadIds).toContain('MTR-02');
    });

    test('should maintain electrical continuity through voltage rating', () => {
      bus.voltage = 4.16;
      
      // In a real electrical system, all equipment connected to the bus
      // should operate at the bus voltage
      expect(bus.voltage).toBe(4.16);
      
      // You could extend this test to validate that connected equipment
      // has compatible voltage ratings
    });
  });

  describe('Bus toString Method', () => {
    test('should provide readable string representation', () => {
      const bus = new Bus('BUS-01', 'Main Bus', {
        voltage: 13.8,
        width: 100
      });
      
      const str = bus.toString();
      expect(str).toContain('BUS-01');
      expect(str).toContain('Main Bus');
      expect(str).toContain('13.8');
    });
  });
});
