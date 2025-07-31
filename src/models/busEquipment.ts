import { EquipmentBase, type InputPropertiesDefinition } from './equipmentBase';
import type { EquipmentBaseData, EquipmentType } from '../types/equipment.types';

/**
 * Bus-specific properties and methods
 */
export interface BusProperties {
  voltage: number; // kV
  allowedSources?: number; // Optional, default is 16
  allowedLoads?: number; // Optional, default is 16
  width?: number; // Optional, custom width for the bus
}

export interface BusEquipmentData extends EquipmentBaseData, BusProperties {
  width?: number; // Include width in the data interface
}

/**
 * Bus class extending EquipmentBase with bus-specific functionality
 */
class Bus extends EquipmentBase {
  public voltage: number;
  public width: number; // Custom width for horizontal resizing

  public static allowedSources: number = 1;
  public static allowedLoads: number = 16;
  public static defaultWidth: number = 60; // Default bus width

  public allowedSources: number = Bus.allowedSources;
  public allowedLoads: number = Bus.allowedLoads;

  constructor(
    id: string,
    name: string,
    properties: BusProperties
  ) {
    super(id, name, 'Bus' as EquipmentType);
    
    this.voltage = properties.voltage;
    this.width = properties.width ?? Bus.defaultWidth;

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
    width: {
      type: 'number',
      label: 'Width (px)',
      defaultValue: Bus.defaultWidth,
      validation: (value: number) => {
        if (value < 20) {
          return 'Width must be at least 20 pixels';
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
      ...super.toJSON(),
      voltage: this.voltage,
      width: this.width
    };
  }

  static fromJSON(data: BusEquipmentData): Bus {
    const bus = new Bus(data.id, data.name, {
      voltage: data.voltage,
      width: data.width
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
    return `Bus(${this.id}, ${this.name}, Voltage: ${this.voltage}kV, Width: ${this.width}px)`;
  }
}

export default Bus;