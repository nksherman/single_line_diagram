import EquipmentBase from '../models/equipmentBase';
import Generator from '../models/generatorEquipment';
import Transformer from '../models/transformerEquipment';
import Bus from '../models/busEquipment';

/**
 * Utility functions for working with equipment connections and validation
 */

/**
 * Get the voltage of equipment based on connection type
 * @param equipment The equipment to get voltage from
 * @param connectionType Whether this is a source or load connection
 * @returns The voltage in kV or null if not available
 */
export function getEquipmentVoltage(equipment: EquipmentBase, connectionType: 'source' | 'load'): number | null {
  if (equipment instanceof Generator) {
    return equipment.voltage;
  } else if (equipment instanceof Transformer) {
    // For transformers, use primary voltage for source connections and secondary for load connections
    return connectionType === 'source' ? equipment.primaryVoltage : equipment.secondaryVoltage;
  } else if (equipment instanceof Bus) {
    return equipment.voltage;
  } else if (equipment.type === 'Transformer') {
    // Fallback for type checking when instanceof doesn't work
    const transformer = equipment as any;
    return connectionType === 'source' ? transformer.primaryVoltage : transformer.secondaryVoltage;
  } else if (equipment.type === 'Bus') {
    // Fallback for type checking when instanceof doesn't work
    const bus = equipment as any;
    return bus.voltage;
  }
  return null;
}

/**
 * Validate voltage compatibility between equipment connections
 * @param selectedSources Array of source equipment IDs
 * @param selectedLoads Array of load equipment IDs
 * @param equipmentList List of all available equipment
 * @param getCurrentVoltage Function to get the current equipment's voltage for a given connection type
 * @param equipmentName Name of the current equipment (for error messages)
 * @returns Array of validation error messages
 */
export function validateVoltageCompatibility(
  selectedSources: string[],
  selectedLoads: string[],
  equipmentList: EquipmentBase[],
  getCurrentVoltage: (connectionType: 'source' | 'load') => number | null,
  equipmentName: string
): string[] {
  const errors: string[] = [];

  // Check source voltage compatibility
  selectedSources.forEach(sourceId => {
    const sourceEquipment = equipmentList.find(eq => eq.id === sourceId);
    if (sourceEquipment) {
      const sourceVoltage = getEquipmentVoltage(sourceEquipment, 'load'); // Source provides load-side voltage to us
      const ourVoltage = getCurrentVoltage('source'); // We receive on our source-side
      
      if (sourceVoltage !== null && ourVoltage !== null && sourceVoltage !== ourVoltage) {
        errors.push(`Voltage mismatch: ${sourceEquipment.name} provides ${sourceVoltage}kV but ${equipmentName} expects ${ourVoltage}kV on source side`);
      }
    }
  });

  // Check load voltage compatibility
  selectedLoads.forEach(loadId => {
    const loadEquipment = equipmentList.find(eq => eq.id === loadId);
    if (loadEquipment) {
      const loadVoltage = getEquipmentVoltage(loadEquipment, 'source'); // Load expects source-side voltage from us
      const ourVoltage = getCurrentVoltage('load'); // We provide on our load-side
      
      if (loadVoltage !== null && ourVoltage !== null && loadVoltage !== ourVoltage) {
        errors.push(`Voltage mismatch: ${equipmentName} provides ${ourVoltage}kV but ${loadEquipment.name} expects ${loadVoltage}kV`);
      }
    }
  });

  return errors;
}

/**
 * Get current equipment voltage based on property values and equipment type
 * Used in equipment creator for dynamic voltage checking
 * @param selectedEquipmentType The type of equipment being created
 * @param propertyValues The current property values
 * @param connectionType Whether this is a source or load connection
 * @returns The voltage in kV or null if not available
 */
export function getCurrentEquipmentVoltage(
  selectedEquipmentType: string,
  propertyValues: Record<string, any>,
  connectionType: 'source' | 'load'
): number | null {
  if (selectedEquipmentType === 'Generator') {
    return propertyValues.voltage || 0;
  } else if (selectedEquipmentType === 'Transformer') {
    // For transformers, use primary voltage for source connections and secondary for load connections
    return connectionType === 'source' 
      ? (propertyValues.primaryVoltage || 0) 
      : (propertyValues.secondaryVoltage || 0);
  } else if (selectedEquipmentType === 'Bus') {
    return propertyValues.voltage || 0;
  }
  return null;
}

/**
 * Validate connection limits for equipment
 * @param selectedSources Array of source equipment IDs
 * @param selectedLoads Array of load equipment IDs
 * @param maxSources Maximum allowed sources
 * @param maxLoads Maximum allowed loads
 * @param equipmentType Type of equipment for error messages
 * @returns Array of validation error messages
 */
export function validateConnectionLimits(
  selectedSources: string[],
  selectedLoads: string[],
  maxSources: number,
  maxLoads: number,
  equipmentType: string
): string[] {
  const errors: string[] = [];

  if (selectedSources.length > maxSources) {
    errors.push(`${equipmentType} can have at most ${maxSources} sources`);
  }
  
  if (selectedLoads.length > maxLoads) {
    errors.push(`${equipmentType} can have at most ${maxLoads} loads`);
  }

  return errors;
}

/**
 * Check if equipment connections would cause conflicts
 * @param sourceEquipment Array of source equipment
 * @param loadEquipment Array of load equipment
 * @param currentEquipmentId ID of the current equipment being edited (to exclude from checks)
 * @returns Array of validation error messages
 */
export function validateConnectionConflicts(
  sourceEquipment: EquipmentBase[],
  loadEquipment: EquipmentBase[],
  currentEquipmentId?: string
): string[] {
  const errors: string[] = [];

  // Check if sources can accept this equipment as a load
  sourceEquipment.forEach(source => {
    const currentLoads = Array.from(source.loads).filter(load => 
      currentEquipmentId ? load.id !== currentEquipmentId : true
    );
    if (currentLoads.length >= source.allowedLoads) {
      errors.push(`Source ${source.name} already has maximum loads`);
    }
  });

  // Check if loads can accept this equipment as a source
  loadEquipment.forEach(load => {
    const currentSources = Array.from(load.sources).filter(source => 
      currentEquipmentId ? source.id !== currentEquipmentId : true
    );
    if (currentSources.length >= load.allowedSources) {
      errors.push(`Load ${load.name} already has maximum sources`);
    }
  });

  return errors;
}
