import { EquipmentBase } from './equipmentBase';
import type { EquipmentBaseData, EquipmentType } from '../types/equipment.types';

/**
 * Circuit Breaker-specific properties and methods
 */
export interface CircuitBreakerProperties {
  voltageRating: number; // kV
  currentRating: number; // A
  breakingCapacity: number; // kA

  isOperational: boolean;
}

export interface CircuitBreakerEquipmentData extends EquipmentBaseData, CircuitBreakerProperties {}

/**
 * Circuit Breaker class extending EquipmentBase with circuit breaker-specific functionality
 */
export class CircuitBreaker extends EquipmentBase {
  public voltageRating: number;
  public currentRating: number;
  public breakingCapacity: number;

  // dynamic state variables
  public isOperational: boolean;

  constructor(
    id: string,
    name: string,
    properties: CircuitBreakerProperties
  ) {
    super(id, name, 'CircuitBreaker' as EquipmentType);

    this.voltageRating = properties.voltageRating;
    this.currentRating = properties.currentRating;
    this.breakingCapacity = properties.breakingCapacity;
    
    this.isOperational = properties.isOperational;
  }

  operate(): void {
    this.isOperational = true;
    console.log(`Circuit Breaker ${this.name} is now operational`);
  }

  shutDown(): void {
    this.isOperational = false;
    console.log(`Circuit Breaker ${this.name} has been shut down`);
  }

  /**
   * Serialization and deserialization methods
   */
  toJSON(): CircuitBreakerEquipmentData {
    return {
      ...super.toJSON(),
      voltageRating: this.voltageRating,
      currentRating: this.currentRating,
      breakingCapacity: this.breakingCapacity,
      isOperational: this.isOperational
    };
  }

  static fromJSON(data: CircuitBreakerEquipmentData): CircuitBreaker {
    return new CircuitBreaker(data.id, data.name, {
      voltageRating: data.voltageRating,
      currentRating: data.currentRating,
      breakingCapacity: data.breakingCapacity,
      isOperational: data.isOperational
    });
  }
  static rebuildConnections(circuitBreakerData: CircuitBreakerEquipmentData[]): void {
    // First create all circuit breakers without connections
    circuitBreakerData.forEach(data => {
      if (!EquipmentBase.getById(data.id)) {
        CircuitBreaker.fromJSON(data);
      }
    });

    // Then rebuild connections
    circuitBreakerData.forEach(data => {
      const circuitBreaker = EquipmentBase.getById(data.id, CircuitBreaker);
      if (!circuitBreaker) return;

      // Connect to loads
      data.loadIds?.forEach(loadId => {
        const load = EquipmentBase.getById(loadId);
        if (load) {
          circuitBreaker.addLoad(load);
        }
      });
    });
  }

  toString(): string {
    return `CircuitBreaker(${this.id}: ${this.name} [${this.voltageRating}kV, ${this.currentRating}A, ${this.breakingCapacity}kA, ${this.isOperational ? 'Online' : 'Offline'}])`;
  }
}

