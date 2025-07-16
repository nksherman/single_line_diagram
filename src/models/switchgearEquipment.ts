import { EquipmentBase } from './equipmentBase';
import type { EquipmentBaseData, EquipmentType } from '../types/equipment.types';


/**
 * Switchgear-specific properties and methods
 */
export interface SwitchgearProperties {
  voltageRating: number; // kV
  currentRating: number; // A
  insulationType: 'air' | 'gas' | 'oil';
  isOperational: boolean;
}

export interface SwitchgearEquipmentData extends EquipmentBaseData, SwitchgearProperties {}

/**
 * Switchgear class extending EquipmentBase with switchgear-specific functionality
 */
export class Switchgear extends EquipmentBase {
  public voltageRating: number;
  public currentRating: number;
  public insulationType: SwitchgearProperties['insulationType'];
  public isOperational: boolean;

  constructor(
    id: string,
    name: string,
    properties: SwitchgearProperties
  ) {
    super(id, name, 'Switchgear' as EquipmentType);
    
    this.voltageRating = properties.voltageRating;
    this.currentRating = properties.currentRating;
    this.insulationType = properties.insulationType;
    this.isOperational = properties.isOperational;
  }

  operate(): void {
    this.isOperational = true;
    console.log(`Switchgear ${this.name} is now operational`);
  }

  shutDown(): void {
    this.isOperational = false;
    console.log(`Switchgear ${this.name} has been shut down`);
  }

  /**
   * Serialization and deserialization methods
   */  

  toJSON(): SwitchgearEquipmentData {
    return {
      ...super.toJSON(),
      voltageRating: this.voltageRating,
      currentRating: this.currentRating,
      insulationType: this.insulationType,
      isOperational: this.isOperational
    };
  }

  static fromJSON(data: SwitchgearEquipmentData): Switchgear {
    return new Switchgear(data.id, data.name, {
      voltageRating: data.voltageRating,
      currentRating: data.currentRating,
      insulationType: data.insulationType,
      isOperational: data.isOperational
    });
  }
}
