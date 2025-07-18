import { EquipmentBase, type InputPropertiesDefinition } from './equipmentBase';
import type { EquipmentBaseData, EquipmentType } from '../types/equipment.types';

/**
 * Generator-specific properties and methods
 */
export interface GeneratorProperties {
  capacity: number; // MW
  voltage: number; // kV
  fuelType: 'natural_gas' | 'diesel' | 'solar' | 'wind' | 'hydro' | 'nuclear' | 'coal';
  efficiency: number; // percentage
  isOnline: boolean;
}


export interface GeneratorEquipmentData extends EquipmentBaseData, GeneratorProperties {}

/**
 * Generator class extending EquipmentBase with generator-specific functionality
 */
class Generator extends EquipmentBase {
  public capacity: number;
  public voltage: number;
  public fuelType: GeneratorProperties['fuelType'];
  public efficiency: number;

  public allowedSources: number = 0;
  public allowedLoads: number = 1;

  // dynamic state variables
  public isOnline: boolean;

  constructor(
    id: string,
    name: string,
    properties: GeneratorProperties
  ) {
    super(id, name, 'Generator' as EquipmentType);
    
    this.capacity = properties.capacity;
    this.voltage = properties.voltage;
    this.fuelType = properties.fuelType;
    this.efficiency = properties.efficiency;
    this.isOnline = properties.isOnline;
  }

  static inputProperties: InputPropertiesDefinition = {
    capacity: {
      type: 'number',
      label: 'Capacity (MW)',
      defaultValue: 10,
      validation: (value: number) => {
        if (value <= 0) {
          return 'Capacity must be a positive number';
        }
      }
    },
    voltage: {
      type: 'number',
      label: 'Voltage (kV)',
      defaultValue: 13.8,
      validation: (value: number) => {
        if (value <= 0) {
          return 'Voltage must be a positive number';
        }
      }
    },
    fuelType: {
      type: 'select',
      label: 'Fuel Type',
      defaultValue: 'natural_gas',
      options: ['natural_gas', 'diesel', 'solar', 'wind', 'hydro', 'nuclear', 'coal'],
      validation: (value: string) => {
        const validFuels = ['natural_gas', 'diesel', 'solar', 'wind', 'hydro', 'nuclear', 'coal'];
        if (!validFuels.includes(value)) {
          return 'Invalid fuel type';
        }
      }
    },
    efficiency: {
      type: 'number',
      label: 'Efficiency (%)',
      defaultValue: 85,
      validation: (value: number) => {
        if (value < 0 || value > 100) {
          return 'Efficiency must be between 0 and 100';
        }
      }
    }
  }

  start(): void {
    this.isOnline = true;
    console.log(`Generator ${this.name} started`);
  }

  stop(): void {
    this.isOnline = false;
    console.log(`Generator ${this.name} stopped`);
  }

  getCurrentOutput(): number {
    return this.isOnline ? this.capacity * (this.efficiency / 100) : 0;
  }

  /**
   * Serialization and deserialization methods
   */  

  toJSON(): GeneratorEquipmentData {
    return {
      ...super.toJSON(),
      capacity: this.capacity,
      voltage: this.voltage,
      fuelType: this.fuelType,
      efficiency: this.efficiency,
      isOnline: this.isOnline
    };
  }

  static fromJSON(data: GeneratorEquipmentData): Generator {
    return new Generator(data.id, data.name, {
      capacity: data.capacity,
      voltage: data.voltage,
      fuelType: data.fuelType,
      efficiency: data.efficiency,
      isOnline: data.isOnline
    });
  }

  static rebuildConnections(generatorData: GeneratorEquipmentData[]): void {
    // First create all generators without connections
    generatorData.forEach(data => {
      if (!EquipmentBase.getById(data.id)) {
        Generator.fromJSON(data);
      }
    });

    // Then rebuild connections
    generatorData.forEach(data => {
      const generator = EquipmentBase.getById(data.id, Generator);
      if (!generator) return;
      
      // Connect to loads
      data.loadIds?.forEach(loadId => {
        const load = EquipmentBase.getById(loadId);
        if (load) {
          generator.addLoad(load);
        }
      });
    });
  }

  toString(): string {
    return `Generator(${this.id}: ${this.name} [${this.capacity}MW, ${this.fuelType}, ${this.isOnline ? 'Online' : 'Offline'}])`;
  }
}

export default Generator; 