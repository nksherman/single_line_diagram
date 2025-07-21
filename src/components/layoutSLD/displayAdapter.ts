import { EquipmentBase } from '../../models/equipmentBase';
import type { EquipmentBaseData, EquipmentType } from '../../types/equipment.types';

import Generator from '../../models/generatorEquipment';
import Transformer from '../../models/transformerEquipment';
import Bus from '../../models/busEquipment';
import Meter from '../../models/meterEquipment';

export interface TextElement {
  id: string;
  text: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'left-top' | 'left-bottom' | 'right-top' | 'right-bottom';
  align: 'left' | 'center' | 'right';
  fontSize?: number;
  color?: string;
  offset?: { x: number; y: number };
}

export interface DisplayNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  label: string;
  iconPath: string;
  textElements: TextElement[];
  metadata: Record<string, any>;
  equipment: EquipmentBase; // Optional, for direct equipment reference
}

export interface DisplayConnection {
  id: string;
  sourceId: string;
  targetId: string;
  points: number[];
}

// Adapter to convert equipment to display data
class EquipmentDisplayAdapter {
  private static getDefaultSize(type: string): { width: number; height: number } {
    const sizes: Record<string, { width: number; height: number }> = {
      Generator: { width: 40, height: 40 },
      Transformer: { width: 50, height: 40 },
      Bus: { width:  60, height: 4 },
      Load: { width: 30, height: 30 },
      // Add more equipment types as needed
    };

    return sizes[type] || { width: 40, height: 40 };
  }

  private static getTextElements(equipment: EquipmentBase): TextElement[] {
    const textElements: TextElement[] = [];

    // Equipment name common
    textElements.push({
      id: `${equipment.id}-name`,
      text: equipment.name,
      position: 'top-right',
      align: 'left',
      fontSize: 12
    });

    // Type-specific text elements
    if (equipment instanceof Generator) {
      textElements.push(...this.getGeneratorTextElements(equipment));
    } else if (equipment instanceof Transformer) {
      textElements.push(...this.getTransformerTextElements(equipment));
    } else if (equipment instanceof Bus) {
      textElements.push(...this.getBusTextElements(equipment));
    } else if (equipment instanceof Meter) {
      textElements.push(...this.getMeterTextElements(equipment));
    }

    return textElements;
  }

  private static getGeneratorTextElements(generator: Generator): TextElement[] {
    return [
      {
        id: `${generator.id}-capacity`,
        text: `${generator.capacity}MW`,
        position: 'left-top',
        align: 'right',
        fontSize: 10,
        color: 'blue'
      },
      {
        id: `${generator.id}-voltage`,
        text: `${generator.voltage}kV`,
        position: 'left-bottom',
        align: 'right',
        fontSize: 10,
        color: 'green'
      },
      {
        id: `${generator.id}-status`,
        text: generator.isOnline ? 'ON' : 'OFF',
        position: 'right',
        align: 'left',
        fontSize: 10,
        color: generator.isOnline ? 'green' : 'red',
        offset: { x: 5, y: 0 }
      }
    ];
  }

  private static getTransformerTextElements(transformer: Transformer): TextElement[] {
    return [
      {
        id: `${transformer.id}-primary-voltage`,
        text: `${transformer.primaryVoltage}kV`,
        position: 'left-top',
        align: 'right',
        fontSize: 10,
        color: 'blue'
      },
      {
        id: `${transformer.id}-secondary-voltage`,
        text: `${transformer.secondaryVoltage}kV`,
        position: 'left-bottom',
        align: 'right',
        fontSize: 10,
        color: 'green'
      },
      {
        id: `${transformer.id}-power-rating`,
        text: `${transformer.powerRating}MVA`,
        position: 'right-top',
        align: 'left',
        fontSize: 10,
        color: 'purple'

      },
      {
        id: `${transformer.id}-phase-count`,
        text: `${transformer.phaseCount} Phases`,
        position: 'right',
        align: 'left',
        fontSize: 10,
        offset: { x: 5, y: 0 }
      },
      {
        id: `${transformer.id}-connection-type`,
        text: transformer.connectionType,
        position: 'right-bottom',
        align: 'left',
        fontSize: 10,
        color: 'orange'
      }
    ];

  }

  private static getBusTextElements(bus: Bus): TextElement[] {
    return [
      {
        id: `${bus.id}-voltage`,
        text: `${bus.voltage}kV`,
        position: 'top-left',
        align: 'center',
        fontSize: 10,
        color: 'blue'
      }
    ];
  }

  private static getMeterTextElements(meter: Meter): TextElement[] {
    return [
      {
        id: `${meter.id}-voltage`,
        text: `${meter.voltageRating}kV`,
        position: 'top-left',
        align: 'right',
        fontSize: 10,
        color: 'blue'
      },
      {
        id: `${meter.id}-current`,
        text: `${meter.currentRating}A`,
        position: 'right',
        align: 'left',
        fontSize: 10,
        color: 'green'
      },
      {
        id: `${meter.id}-accuracy`,
        text: `Class ${meter.accuracyClass}`,
        position: 'right-bottom',
        align: 'left',
        fontSize: 10,
        color: 'orange'
      },
      {
        id: `${meter.id}-status`,
        text: meter.isOperational ? 'Operational' : 'Not Operational',
        position: 'bottom-left',
        align: 'right',
        fontSize: 10,
        color: meter.isOperational ? 'green' : 'red'
      }
    ];
  }

  static toDisplayNodes(equipment: EquipmentBase[]): DisplayNode[] {
    return equipment.map(eq => ({
      id: eq.id,
      type: eq.type,
      position: { x: 0, y: 0 },
      size: this.getDefaultSize(eq.type),
      label: eq.name,
      iconPath: `/icons/${eq.type.toLowerCase()}.svg`,
      textElements: this.getTextElements(eq),
      metadata: { ...eq.metadata },
      equipment: eq
    }));
  }
  
  static toDisplayConnections(equipment: EquipmentBase[]): DisplayConnection[] {
    const connections: DisplayConnection[] = [];
    equipment.forEach(eq => {
      eq.loads.forEach(load => {
        connections.push({
          id: `${eq.id}-${load.id}`,
          sourceId: eq.id,
          targetId: load.id,
          points: []
        });
      });
    });
    return connections;
  }
}

export default EquipmentDisplayAdapter;