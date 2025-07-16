import { EquipmentBase } from './equipmentBase';
import type { EquipmentBaseData, EquipmentType } from '../types/equipment.types';

/**
 * Meter-specific properties and methods
 */
export interface MeterProperties {
  voltageRating: number; // kV
  currentRating: number; // A
  accuracyClass: string; // e.g., '0.2', '0.5'
  isOperational: boolean;
}

export interface MeterEquipmentData extends EquipmentBaseData, MeterProperties {}

/**
 * Meter class extending EquipmentBase with meter-specific functionality
 */
export class Meter extends EquipmentBase {
  public voltageRating: number;
  public currentRating: number;
  public accuracyClass: string;
  public isOperational: boolean;

  constructor(
    id: string,
    name: string,
    properties: MeterProperties
  ) {
    super(id, name, 'Meter' as EquipmentType);

    this.voltageRating = properties.voltageRating;
    this.currentRating = properties.currentRating;
    this.accuracyClass = properties.accuracyClass;
    
    this.isOperational = properties.isOperational;
  }

  operate(): void {
    this.isOperational = true;
    console.log(`Meter ${this.name} is now operational`);
  }

  shutDown(): void {
    this.isOperational = false;
    console.log(`Meter ${this.name} has been shut down`);
  }

  /**
   * Serialization and deserialization methods
   */
  toJSON(): MeterEquipmentData {
    return {
      ...super.toJSON(),
      voltageRating: this.voltageRating,
      currentRating: this.currentRating,
      accuracyClass: this.accuracyClass,
      isOperational: this.isOperational
    };
  }

  static fromJSON(data: MeterEquipmentData): Meter {
    return new Meter(data.id, data.name, {
      voltageRating: data.voltageRating,
      currentRating: data.currentRating,
      accuracyClass: data.accuracyClass,
      isOperational: data.isOperational
    });
  }

  toString(): string {
    return `Meter(${this.id}: ${this.name} [${this.voltageRating}kV, ${this.currentRating}A, ${this.accuracyClass}, ${this.isOperational ? 'Online' : 'Offline'}])`;
  }
}
