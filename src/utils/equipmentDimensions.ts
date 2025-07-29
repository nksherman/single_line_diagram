import EquipmentBase from '../models/equipmentBase';
import Generator from '../models/generatorEquipment';
import Transformer from '../models/transformerEquipment';
import Bus from '../models/busEquipment';
import Meter from '../models/meterEquipment';

export interface TextGroup {
  left: string[];
  right: string[];
  topLeft?: string;
  topRight?: string;
  bottomLeft?: string;
  bottomRight?: string;
}

/**
 * Get base equipment icon size based on type
 */
export const getBaseEquipmentSize = (type: string): { width: number; height: number } => {
  const sizes: Record<string, { width: number; height: number }> = {
    Generator: { width: 40, height: 40 },
    Transformer: { width: 60, height: 40 },
    Bus: { width: 60, height: 4 },
    Meter: { width: 30, height: 30 },
    Switchgear: { width: 40, height: 40 },
    Breaker: { width: 30, height: 30 },
    Load: { width: 30, height: 30 },
  };
  return sizes[type] || { width: 40, height: 40 };
};

/**
 * Generate text groups based on equipment type and properties
 */
export const getTextGroups = (equipment: EquipmentBase): TextGroup => {
  const textGroup: TextGroup = {
    left: [],
    right: [],
    topLeft: equipment.name
  };

  // Type-specific text elements
  if (equipment instanceof Generator) {
    const gen = equipment as Generator;
    textGroup.right = [
      `${gen.capacity}MW`,
    ];
    textGroup.bottomRight = `${gen.voltage}kV`;

  } else if (equipment instanceof Transformer) {
    const trans = equipment as Transformer;
    textGroup.left = [
      `${trans.powerRating}MVA`
    ];
    textGroup.right = [
      `${trans.primaryVoltage}kV`,
      `${trans.secondaryVoltage}kV`
    ];
  } else if (equipment instanceof Bus) {
    const bus = equipment as Bus;
    textGroup.topRight = `${bus.voltage}kV`;
  } else if (equipment instanceof Meter) {
    const meter = equipment as Meter;
    textGroup.right = [
      `${meter.currentRating}A`,
      `${meter.voltageRating}kV`,
    ];
  }

  return textGroup;
};

/**
 * Calculate dynamic width based on text content
 */
const calculateWidth = (textGroups: TextGroup, iconWidth: number): number => {
  const baseIconWidth = iconWidth;
  
  // Estimate text width (rough approximation)
  const estimateTextWidth = (texts: string[]): number => {
    if (texts.length === 0) return 0;
    const maxLength = Math.max(...texts.map(text => text.length));
    return Math.max(maxLength * 10); // Rough character width estimation
  };

  const leftWidth = estimateTextWidth(textGroups.left);
  const rightWidth = estimateTextWidth(textGroups.right);
  const topBottomWidth = Math.max(
    estimateTextWidth(textGroups.topLeft ? [textGroups.topLeft] : []) +  estimateTextWidth(textGroups.topRight ? [textGroups.topRight] : []),
    estimateTextWidth(textGroups.bottomLeft ? [textGroups.bottomLeft] : []) + estimateTextWidth(textGroups.bottomRight ? [textGroups.bottomRight] : [])
  );

  return Math.max(
    baseIconWidth + leftWidth + rightWidth,
    topBottomWidth,
    40 // Minimum width
  );
};

/**
 * Calculate the actual rendered dimensions of an equipment node
 * This includes both the base equipment size and dynamic sizing based on text content
 */
export const calculateEquipmentDimensions = (equipment: EquipmentBase): { width: number; height: number } => {
  const baseSize = getBaseEquipmentSize(equipment.type);
  const textGroups = getTextGroups(equipment);
  
  let calculatedWidth: number;
  
  // For Bus equipment, use the stored width if available
  if (equipment instanceof Bus) {
    const bus = equipment as Bus;
    calculatedWidth = bus.width;
  } else {
    calculatedWidth = calculateWidth(textGroups, baseSize.width);
  }
  
  // For height, we use the base height as minimum, but could add additional height for text if needed
  // For now, we'll use the minHeight approach like in the original component
  const calculatedHeight = baseSize.height;
  
  return {
    width: calculatedWidth,
    height: calculatedHeight
  };
};
