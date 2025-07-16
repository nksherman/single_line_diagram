/**
 * Type definitions for the equipment system
 */

export interface EquipmentBaseData {
  id: string;
  name: string;
  type: string;
  sourceIds?: string[];
  loadIds?: string[];
}

export interface GeneratorEquipmentData extends EquipmentBaseData {
capacity: number;
voltage: number;
fuelType: 'Diesel' | 'Gas' | 'Renewable';
efficiency: number; // Percentage
isOnline: boolean; // Operational status
}


export interface ConnectionData {
  sourceId: string;
  loadId: string;
}

export type EquipmentType = 
  | 'Generator'
  | 'Transformer'
  | 'Switchgear'
  | 'Motor'
  | 'Panel'
  | 'Bus'
  | 'Breaker'
  | 'Relay'
  | 'Load'
  | 'Source'
  | 'Other';

export interface EquipmentCreateOptions {
  id: string;
  name: string;
  type: EquipmentType;
  metadata?: Record<string, any>;
}

export interface NetworkAnalysis {
  totalEquipment: number;
  sources: string[]; // Equipment with no sources (root nodes)
  sinks: string[];   // Equipment with no loads (leaf nodes)
  cycles: string[][]; // Circular references if any
  maxDepth: number;
}

/**
 * Utility type for equipment queries
 */
export interface EquipmentQuery {
  type?: EquipmentType;
  nameContains?: string;
  hasMinSources?: number;
  hasMinLoads?: number;
  connectedTo?: string; // Equipment ID
}
