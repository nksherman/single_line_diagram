import { EquipmentBase, type InputPropertiesDefinition } from './equipmentBase';
import type { EquipmentBaseData, EquipmentType } from '../types/equipment.types';

// import generatorSymbol from '../../public/icons/generator.svg';

/**
 * Generator-specific properties and methods
 */
export interface BusProperties {
  voltage: number; // kV
}

export interface BusEquipmentData extends EquipmentBaseData, BusProperties {}

/**
 * Bus class extending EquipmentBase with bus-specific functionality
 */
class Bus extends EquipmentBase {
  public voltage: number;

  public allowedSources: number = 16;
  public allowedLoads: number = 16;

  constructor(
    id: string,
    name: string,
    properties: BusProperties
  ) {
    super(id, name, 'Bus' as EquipmentType);
    
    this.voltage = properties.voltage;
  }

  static inputProperties: InputPropertiesDefinition = {
    voltage: {
      type: 'number',
      label: 'Voltage (kV)',
      defaultValue: 12,
      validation: (value: number) => {
        if (value <= 0) {
          return 'Voltage must be a positive number';
        }
      }
    }
  };

  toJSON(): BusEquipmentData {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      voltage: this.voltage
    };
  }

  static fromJSON(data: BusEquipmentData): Bus {
    const bus = new Bus(data.id, data.name, {
      voltage: data.voltage
    });
    return bus;
  }

  static rebuildConnections(busData: BusEquipmentData[]): void {
    busData.forEach(data => {
      if (!EquipmentBase.getById(data.id)) {
        Bus.fromJSON(data);
      }
    });
  }

  // Override toString for better debugging
  toString() {
    return `Bus(${this.id}, ${this.name}, Voltage: ${this.voltage}kV)`;
  }
}

export default Bus;