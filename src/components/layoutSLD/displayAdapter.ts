import { EquipmentBase } from '../../models/equipmentBase';
import type { EquipmentBaseData, EquipmentType } from '../../types/equipment.types';

// Display data structures (decoupled from equipment models)
export interface DisplayNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  label: string;
  metadata: Record<string, any>;
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
      Bus: { width: 60, height: 20 },
      Load: { width: 30, height: 30 },
      // Add more equipment types as needed
    };

    return sizes[type] || { width: 40, height: 40 };
  }

  static toDisplayNodes(equipment: EquipmentBase[]): DisplayNode[] {
    return equipment.map(eq => ({
      id: eq.id,
      type: eq.type,
      position: { x: 0, y: 0 },
      size: this.getDefaultSize(eq.type),
      label: eq.name,
      metadata: { ...eq.metadata }
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

export default EquipmentDisplayAdapter