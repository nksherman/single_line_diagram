import { EquipmentBase } from './equipmentBase';
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
export class Transformer extends EquipmentBase {
  public primaryVoltage: number;
  public secondaryVoltage: number;
  public powerRating: number;
  public phaseCount: 1 | 3;
  public connectionType: 'Delta' | 'Wye';
  public impedance: number;

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

