
import { Position } from '@xyflow/react';

/**
 * Type definitions for the equipment system
 */

/**
 * Handle position data for equipment connections
 */
export interface HandlePosition {
  id: string; // Unique identifier for this handle
  side: Position; // Which side of the equipment (top/bottom/left/right)
  positionPercent: number; // Distance from top-left/bottom-right corner as percentage (0-100)
  connectedEquipmentId?: string; // ID of equipment this handle connects to
  isSource: boolean; // True if this is a source handle, false if load handle
}

export interface EquipmentBaseData {
  id: string;
  name: string;
  type: string;
  sourceIds?: string[];
  loadIds?: string[];
  position?: { x: number; y: number }; // For layout purposes
  metadata?: Record<string, any>;
  handles?: HandlePosition[]; // Handle positions for connections
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
