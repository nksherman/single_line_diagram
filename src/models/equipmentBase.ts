import { Position } from '@xyflow/react';

import type { EquipmentBaseData, EquipmentType, HandlePosition } from '../types/equipment.types';

/**
 * Property definition for equipment input forms
 */
export interface PropertyDefinition {
  type: 'number' | 'string' | 'boolean' | 'select';
  label: string;
  defaultValue?: any;
  options?: string[] | number[]; // For select type
  validation?: (value: any) => string | undefined;
}

/**
 * Collection of property definitions for an equipment type
 */
export type InputPropertiesDefinition = Record<string, PropertyDefinition>;

/**
 * Equipment class representing electrical equipment in a single line diagram
 * Each equipment can have multiple sources (upstream connections) and loads (downstream connections)
 * This creates a bidirectional many-to-many relationship graph structure
 */
export class EquipmentBase {
  public readonly id: string;
  public name: string;
  public type: EquipmentType;
  public metadata: Record<string, any> = {};
  
  // Direct references to other Equipment objects
  private _sources: Set<EquipmentBase> = new Set();
  private _loads: Set<EquipmentBase> = new Set();
  
  // Handle positions for connections
  private _handles: HandlePosition[] = [];
  
  // Static registry to track all equipment instances
  private static registry: Map<string, EquipmentBase> = new Map();

  public static allowedSources: number = 1;
  public static allowedLoads: number = 1;

  public allowedSources: number = EquipmentBase.allowedSources;
  public allowedLoads: number = EquipmentBase.allowedLoads;

  // initialize position for layout purposes
  private _position: { x: number; y: number } = { x: 0, y: 0 };
  
  constructor(id: string, name: string, type: EquipmentType) {
    if (EquipmentBase.registry.has(id)) {
      throw new Error(`Equipment with ID "${id}" already exists`);
    }
    
    this.id = id;
    this.name = name;
    this.type = type;
    
    EquipmentBase.registry.set(id, this);
  }

  static inputProperties: InputPropertiesDefinition = {}

  get position(): { x: number; y: number } {
    return { ...this._position };
  }

  set position(pos: { x: number; y: number }) {
    this._position = { ...pos };
  }

  addSource(source: EquipmentBase): void {
    this._sources.add(source);

    this.createHandle({thisSideIsSource: true, otherEquipment: source})
    source._loads.add(this);
    source.createHandle({thisSideIsSource: false, otherEquipment: this});
  }
  
  addLoad(load: EquipmentBase): void {
    this._loads.add(load);
    this.createHandle({thisSideIsSource: false, otherEquipment: load});
    load._sources.add(this);
    load.createHandle({thisSideIsSource: true, otherEquipment: this});
  }
  
  removeSource(source: EquipmentBase): void {
    this._sources.delete(source);
    source._loads.delete(this);
    // delete handles if it exists
    this._handles = this._handles.filter(handle => handle.connectedEquipmentId !== source.id);
    source._handles = source._handles.filter(handle => handle.connectedEquipmentId !== this.id);
  }
  
  removeLoad(load: EquipmentBase): void {
    this._loads.delete(load);
    load._sources.delete(this);

    // delete handles if it exists
    this._handles = this._handles.filter(handle => handle.connectedEquipmentId !== load.id);
    load._handles = load._handles.filter(handle => handle.connectedEquipmentId !== this.id);
  }
  
  get sources(): ReadonlySet<EquipmentBase> {
    return this._sources;
  }
  
  get loads(): ReadonlySet<EquipmentBase> {
    return this._loads;
  }
  
  get sourceIds(): string[] {
    return Array.from(this._sources).map(source => source.id);
  }
  
  get loadIds(): string[] {
    return Array.from(this._loads).map(load => load.id);
  }
  
  get connections(): ReadonlySet<EquipmentBase> {
    const connections = new Set<EquipmentBase>();
    this._sources.forEach(source => connections.add(source));
    this._loads.forEach(load => connections.add(load));
    return connections;
  }
  
  /**
   * Check if this equipment is connected to another equipment
   */
  isConnectedTo(other: EquipmentBase): boolean {
    return this._sources.has(other) || this._loads.has(other);
  }

  /**
   * Handle position management methods
   */
  
  get handles(): ReadonlyArray<HandlePosition> {
    return [...this._handles];
  }

  /**
   * Add a handle position for a connection
   */
  addHandle(handle: HandlePosition): void {
    // Remove existing handle with same ID if exists
    this._handles = this._handles.filter(h => h.id !== handle.id);
    this._handles.push({ ...handle });
    
    // Redistribute all handles on this side
    if (this._handles.length > 1) {
      this.redistributeHandlesOnSide(handle.side);
    }
  }

  /**
   * Redistribute handles evenly on a specific side
   */
  private redistributeHandlesOnSide(side: Position): void {
    const handlesOnSide = this._handles.filter(h => h.side === side);
    const count = handlesOnSide.length;
    
    if (count === 0) return;
    
    if (count === 1) {
      // Single handle goes to center
      handlesOnSide[0].positionPercent = 50;
    } else {
      // Multiple handles are distributed evenly
      // For n handles: positions are at 100/(n+1), 200/(n+1), 300/(n+1), etc.
      handlesOnSide.forEach((handle, index) => {
        handle.positionPercent = ((index + 1) * 100) / (count + 1);
      });
    }
  }

  createHandle({thisSideIsSource, otherEquipment}: {thisSideIsSource: boolean, otherEquipment: EquipmentBase}) {
    // Determine the side based on whether this is a source or target connection
    // thisSideIsSource = true means this equipment acts as a source, so handle goes on bottom
    // thisSideIsSource = false means this equipment acts as a target, so handle goes on top
    const thisSide = thisSideIsSource ?  Position.Top :  Position.Bottom;
   
    // Get handles on the same side to determine the next index
    const handlesOnThisSide = this._handles.filter(handle => handle.side === thisSide);
    
    // Create unique ID based on side and count
    const sidePrefix = thisSideIsSource ? 'target' : 'source';
    const newHandle: HandlePosition = {
      id: `${sidePrefix}-${handlesOnThisSide.length + 1}`,
      side: thisSide,
      positionPercent: 50, // Will be redistributed in addHandle
      connectedEquipmentId: otherEquipment.id,
      isSource: !thisSideIsSource,
    };

    this.addHandle(newHandle);
  }

  /**
   * Remove a handle by ID
   */
  removeHandle(handleId: string): void {
    this._handles = this._handles.filter(h => h.id !== handleId);
  }

  /**
   * Get handle by ID
   */
  getHandle(handleId: string): HandlePosition | undefined {
    return this._handles.find(h => h.id === handleId);
  }

  /**
   * Get handles by side
   */
  getHandlesBySide(side: Position): HandlePosition[] {
    return this._handles.filter(h => h.side === side);
  }

  /**
   * Get handles for a specific connected equipment
   */
  getHandlesForEquipment(equipmentId: string): HandlePosition[] {
    return this._handles.filter(h => h.connectedEquipmentId === equipmentId);
  }

  /**
   * Update handle connection
   */
  updateHandleConnection(handleId: string, connectedEquipmentId?: string): void {
    const handle = this._handles.find(h => h.id === handleId);
    if (handle) {
      handle.connectedEquipmentId = connectedEquipmentId;
    }
  }

  /**
   * Clear all handles
   */
  clearHandles(): void {
    this._handles = [];
  }
  
  /**
   * Get equipment by ID from the registry
   */
  static getById<T extends EquipmentBase = EquipmentBase>(
    id: string, 
    type?: new (...args: any[]) => T
  ): T | undefined {
    const equipment = EquipmentBase.registry.get(id);
    if (!equipment) return undefined;
    
    if (type && !(equipment instanceof type)) {
      return undefined;
    }
    
    return equipment as T;
  }

  /**
   * Get sources of a specific type with proper typing
   */
  getSourcesByType<T extends EquipmentBase>(type: new (...args: any[]) => T): T[] {
    return Array.from(this._sources).filter(source => source instanceof type) as T[];
  }

  /**
   * Get loads of a specific type with proper typing
   */
  getLoadsByType<T extends EquipmentBase>(type: new (...args: any[]) => T): T[] {
    return Array.from(this._loads).filter(load => load instanceof type) as T[];
  }

  /**
   * Get all connected equipment of a specific type
   */
  getConnectionsByType<T extends EquipmentBase>(type: new (...args: any[]) => T): T[] {
    const connections: T[] = [];
    this._sources.forEach(source => {
      if (source instanceof type) connections.push(source as T);
    });
    this._loads.forEach(load => {
      if (load instanceof type) connections.push(load as T);
    });
    return connections;
  }

  
  /**
   * Get all equipment instances
   */
  static getAll(): EquipmentBase[] {
    return Array.from(EquipmentBase.registry.values());
  }

  static getAllByType<T extends EquipmentBase>(type: new (...args: any[]) => T): T[] {
    return Array.from(EquipmentBase.registry.values()).filter(equipment => equipment instanceof type) as T[];
  }
  
  static clearRegistry(): void {
    EquipmentBase.registry.clear();
  }

  /**
   * Generate standardized handle ID that matches the layout algorithm
   */
  static generateStandardHandleId(equipmentId: string, isSource: boolean, side: string, index: number): string {
    const prefix = isSource ? 'src' : 'load';
    return `${equipmentId}-${prefix}-${side}-${index}`;
  }


  /**
   * Create connections between equipment using IDs
   */
  static connectById(sourceId: string, loadId: string): boolean {
    const source = EquipmentBase.getById(sourceId);
    const load = EquipmentBase.getById(loadId);
    
    if (!source || !load) {
      return false;
    }
    
    source.addLoad(load);
    return true;
  }

  /** Saving and Loading methods  */
  toJSON(): EquipmentBaseData {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      sourceIds: this.sourceIds,
      loadIds: this.loadIds,
      position: this.position,
      handles: [...this._handles]
    };
  }

  static fromJSON(data: EquipmentBaseData): EquipmentBase {
    const equipment = new EquipmentBase(data.id, data.name, data.type as EquipmentType);
    equipment.position = data?.position || { x: 0, y: 0 };
    
    // Load handles if they exist
    if (data.handles) {
      equipment._handles = [...data.handles];
    }
    
    return equipment;
  }
  
  static rebuildConnections(equipmentData: Array<EquipmentBaseData>): void {
    equipmentData.forEach(data => {
      const equipment = EquipmentBase.getById(data.id);
      if (!equipment) return;
      
      // Connect to loads (this will automatically create bidirectional relationships)
      data.loadIds?.forEach(loadId => {
        const load = EquipmentBase.getById(loadId);
        if (load) {
          equipment.addLoad(load);
        }
      });
    });
  }
  
  toString(): string {
    return `EquipmentBase(${this.id}: ${this.name} [${this.type}])`;
  }
}

export default EquipmentBase;