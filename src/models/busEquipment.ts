import { EquipmentBase, type InputPropertiesDefinition } from './equipmentBase';
import type { EquipmentBaseData, EquipmentType } from '../types/equipment.types';

// import generatorSymbol from '../../public/icons/generator.svg';

/**
 * Generator-specific properties and methods
 */
export interface BusProperties {
  voltage: number; // kV
  allowedSources?: number; // Optional, default is 16
  allowedLoads?: number; // Optional, default is 16

}

export interface BusEquipmentData extends EquipmentBaseData, BusProperties {}

/**
 * Bus class extending EquipmentBase with bus-specific functionality
 */
class Bus extends EquipmentBase {
  public voltage: number;

  public static allowedSources: number = 1;
  public static allowedLoads: number = 16;

  public allowedSources: number = Bus.allowedSources;
  public allowedLoads: number = Bus.allowedLoads;

  constructor(
    id: string,
    name: string,
    properties: BusProperties
  ) {
    super(id, name, 'Bus' as EquipmentType);
    
    this.voltage = properties.voltage;

    this.allowedSources = properties.allowedSources ?? Bus.allowedSources;
    this.allowedLoads = properties.allowedLoads ?? Bus.allowedLoads;
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
    },
    allowedSources: {
      type: 'number',
      label: 'Source Connections (Max)',
      defaultValue: Bus.allowedSources,
      validation: (value: number) => {
        if (value < 0) {
          return 'Allowed sources must be a non-negative number';
        }
      }
    },
    allowedLoads: {
      type: 'number',
      label: 'Load Connections (Max)',
      defaultValue: Bus.allowedLoads,
      validation: (value: number) => {
        if (value < 0) {
          return 'Allowed loads must be a non-negative number';
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