import { EquipmentBase } from './equipmentBase';
import type { EquipmentBaseData, EquipmentType } from '../types/equipment.types';

import generatorSymbol from '../../public/icons/generator.svg';

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

export function generatorValidation(properties: Partial<GeneratorProperties>): string[] {
  const errors: string[] = [];
  
  if (!properties.capacity || properties.capacity <= 0) {
    errors.push('Capacity must be a positive number');
  }
  
  if (!properties.voltage || properties.voltage <= 0) {
    errors.push('Voltage must be a positive number');
  }
  
  if (!properties.fuelType) {
    errors.push('Fuel type is required');
  }
  
  if (typeof properties.efficiency !== 'number' || properties.efficiency < 0 || properties.efficiency > 100) {
    errors.push('Efficiency must be a percentage between 0 and 100');
  }
  
  return errors;
}

export interface GeneratorEquipmentData extends EquipmentBaseData, GeneratorProperties {}

/**
 * Generator class extending EquipmentBase with generator-specific functionality
 */
export class Generator extends EquipmentBase {
  public capacity: number;
  public voltage: number;
  public fuelType: GeneratorProperties['fuelType'];
  public efficiency: number;

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

  static inputProperties: string[] = [
    "capacity",
    "voltage",
    "fuelType",
    "efficiency"
  ]

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