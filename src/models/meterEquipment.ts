import { EquipmentBase, type InputPropertiesDefinition  } from './equipmentBase';
import type { EquipmentBaseData, EquipmentType } from '../types/equipment.types';

type AccuracyClass= "0.2" | "0.5" | "1.0" | "2.0";

/**
 * Meter-specific properties and methods
 */
export interface MeterProperties {
  voltageRating: number; // kV
  currentRating: number; // A
  accuracyClass:AccuracyClass // accuracy class
  isOperational: boolean;
  allowedSources?: number;
  allowedLoads?: number;
}

export interface MeterEquipmentData extends EquipmentBaseData, MeterProperties {}

/**
 * Meter class extending EquipmentBase with meter-specific functionality
 */
class Meter extends EquipmentBase {
  public voltageRating: number;
  public currentRating: number;
  public accuracyClass: AccuracyClass;

  public static allowedSources: number = 1;
  public static allowedLoads: number = 16;

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

    this.allowedSources = properties.allowedSources ?? Meter.allowedSources;
    this.allowedLoads = properties.allowedLoads ?? Meter.allowedLoads;
  }

  static inputProperties: InputPropertiesDefinition = {
    voltageRating: {
      type: 'number',
      label: 'Voltage Rating (kV)',
      defaultValue: 12,
      validation: (value: number) => {
        if (value <= 0) {
          return 'Voltage rating must be a positive number';
        }
      }
    },
    currentRating: {
      type: 'number',
      label: 'Current Rating (A)',
      defaultValue: 100,
      validation: (value: number) => {
        if (value <= 0) {
          return 'Current rating must be a positive number';
        }
      }
    },
    accuracyClass: {
      type: 'select',
      label: 'Accuracy Class',
      defaultValue: '0.5',
      options: ['0.2', '0.5', '1.0', '2.0'],
      validation: (value: string) => {
        const validClasses = ['0.2', '0.5', '1.0', '2.0'];
        if (!validClasses.includes(value)) {
          return 'Invalid accuracy class';
        }
      }
    },
  };

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


export default Meter;