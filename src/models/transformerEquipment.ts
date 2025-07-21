import { EquipmentBase, type InputPropertiesDefinition } from './equipmentBase';
import type { EquipmentBaseData, EquipmentType } from '../types/equipment.types';

/**
 * Transformer-specific properties and methods
 */
export interface TransformerProperties {
  primaryVoltage: number; // kV
  secondaryVoltage: number; // kV
  powerRating: number; // MVA
  phaseCount: 1 | 3;
  connectionType: 'Delta' | 'Wye';
  impedance: number; // percentage

  isOperational: boolean;
}


export interface TransformerEquipmentData extends EquipmentBaseData, TransformerProperties {}

/**
 * Transformer class extending EquipmentBase with transformer-specific functionality
 */
class Transformer extends EquipmentBase {
  public primaryVoltage: number;
  public secondaryVoltage: number;
  public powerRating: number;
  public phaseCount: 1 | 3;
  public connectionType: 'Delta' | 'Wye';
  public impedance: number;

  public static allowedSources: number = 1;
  public static allowedLoads: number = 1;

  // dynamic state variables
  public isOperational: boolean;

  constructor(
    id: string,
    name: string,
    properties: TransformerProperties
  ) {
    super(id, name, 'Transformer' as EquipmentType);

    this.primaryVoltage = properties.primaryVoltage;
    this.secondaryVoltage = properties.secondaryVoltage;
    this.powerRating = properties.powerRating;
    this.phaseCount = properties.phaseCount;
    this.connectionType = properties.connectionType;
    this.impedance = properties.impedance;
    
    this.isOperational = properties.isOperational;
  }

  static inputProperties: InputPropertiesDefinition = {
    primaryVoltage: {
      type: 'number',
      label: 'Primary Voltage (kV)',
      defaultValue: 13.8,
      validation: (value: number) => {
        if (value <= 0) {
          return 'Primary voltage must be a positive number';
        }
      }
    },
    secondaryVoltage: {
      type: 'number',
      label: 'Secondary Voltage (kV)',
      defaultValue: 4.16,
      validation: (value: number) => {
        if (value <= 0) {
          return 'Secondary voltage must be a positive number';
        }
      }
    },
    powerRating: {
      type: 'number',
      label: 'Power Rating (MVA)',
      defaultValue: 25,
      validation: (value: number) => {
        if (value <= 0) {
          return 'Power rating must be a positive number';
        }
      }
    },
    phaseCount: {
      type: 'select',
      label: 'Phase Count',
      defaultValue: 3,
      options: [1, 3],
      validation: (value: number) => {
        if (value !== 1 && value !== 3) {
          return 'Phase count must be 1 or 3';
        }
      }
    },
    connectionType: {
      type: 'select',
      label: 'Connection Type',
      defaultValue: 'Wye',
      options: ['Delta', 'Wye'],
      validation: (value: string) => {
        if (!['Delta', 'Wye'].includes(value)) {
          return 'Connection type must be Delta or Wye';
        }
      }
    },
    impedance: {
      type: 'number',
      label: 'Impedance (%)',
      defaultValue: 5.75,
      validation: (value: number) => {
        if (value <= 0) {
          return 'Impedance must be a positive number';
        }
      }
    }
  }

  start(): void {
    this.isOperational = true;
    console.log(`Transformer ${this.name} started`);
  }

  stop(): void {
    this.isOperational = false;
    console.log(`Transformer ${this.name} stopped`);
  }


  /**
   * Serialization and deserialization methods
   */  

  toJSON(): TransformerEquipmentData {
    return {
      ...super.toJSON(),
      primaryVoltage: this.primaryVoltage,
      secondaryVoltage: this.secondaryVoltage,
      powerRating: this.powerRating,
      phaseCount: this.phaseCount,
      connectionType: this.connectionType,
      impedance: this.impedance,
      isOperational: this.isOperational
    };
  }

  static fromJSON(data: TransformerEquipmentData): Transformer {
    return new Transformer(data.id, data.name, {
      primaryVoltage: data.primaryVoltage,
      secondaryVoltage: data.secondaryVoltage,
      powerRating: data.powerRating,
      phaseCount: data.phaseCount,
      connectionType: data.connectionType,
      impedance: data.impedance,
      isOperational: data.isOperational
    });
  }

  static rebuildConnections(transformerData: TransformerEquipmentData[]): void {
    // First create all transformers without connections
    transformerData.forEach(data => {
      if (!EquipmentBase.getById(data.id)) {
        Transformer.fromJSON(data);
      }
    });

    // Then rebuild connections
    transformerData.forEach(data => {
      const transformer = EquipmentBase.getById(data.id, Transformer);
      if (!transformer) return;

      // Connect to loads
      data.loadIds?.forEach(loadId => {
        const load = EquipmentBase.getById(loadId);
        if (load) {
          transformer.addLoad(load);
        }
      });
    });
  }

  toString(): string {
    return `Transformer(${this.id}: ${this.name} [${this.primaryVoltage}kV, ${this.secondaryVoltage}kV, ${this.powerRating}MVA, ${this.phaseCount}Ph, ${this.connectionType}, ${this.impedance}%, ${this.isOperational ? 'Online' : 'Offline'}])`;
  }
}

export default Transformer;