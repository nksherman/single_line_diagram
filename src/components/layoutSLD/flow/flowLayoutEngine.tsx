import React, { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  ConnectionMode,
} from '@xyflow/react';
import type { Node, Edge, NodeTypes, NodeChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ReactFlowEquipmentNode from './flowEquipmentNode';
import EquipmentBase from '../../../models/equipmentBase';

/**
 *  This function takes a list of equipment and generates a layout for them.
 *  Equipment have initially, undetermined positions and sizes.
 */

export interface FlowLayoutEngineProps {
  equipmentList: EquipmentBase[];
  onEditEquipment: (equipment: EquipmentBase) => void;
}

const ReactFlowLayoutEngine: React.FC<FlowLayoutEngineProps> = ({
  equipmentList,
  onEditEquipment,
}) => {
  const vertSpace = 150; // vertical space between nodes
  const nodeSpacing = 120; // horizontal space between nodes
  const margin = 50; // margin around the edges

  // Custom node types
  const nodeTypes: NodeTypes = useMemo(() => ({
    equipmentNode: ReactFlowEquipmentNode,
  }), []);

  // Generate initial layout using topological sorting
  const generateInitialLayout = useCallback((equipment: EquipmentBase[]) => {
    if (equipment.length === 0) return { nodes: [], edges: [] };

    // Get equipment size based on type
    const getEquipmentSize = (type: string): { width: number; height: number } => {
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

    // Build dependency graph for topological sorting
    const graph = new Map<string, Set<string>>();
    const inDegree = new Map<string, number>();
    
    // Initialize graph and in-degree count
    equipment.forEach(eq => {
      graph.set(eq.id, new Set());
      inDegree.set(eq.id, 0);
    });

    // Build the graph (source -> load relationships)
    equipment.forEach(eq => {
      eq.loads.forEach(load => {
        graph.get(eq.id)?.add(load.id);
        inDegree.set(load.id, (inDegree.get(load.id) || 0) + 1);
      });
    });

    // Topological sort to determine vertical levels
    const levels: string[][] = [];
    const queue: string[] = [];
    const visited = new Set<string>();
    
    // Find all nodes with no incoming edges (sources)
    equipment.forEach(eq => {
      if (inDegree.get(eq.id) === 0) {
        queue.push(eq.id);
      }
    });

    // If no sources found, pick the first node to prevent infinite loop
    if (queue.length === 0 && equipment.length > 0) {
      queue.push(equipment[0].id);
    }

    // Process nodes level by level
    while (queue.length > 0) {
      const currentLevel: string[] = [];
      const nextQueue: string[] = [];
      
      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (visited.has(nodeId)) continue;
        
        currentLevel.push(nodeId);
        visited.add(nodeId);
        
        // Reduce in-degree for all loads and add to next level if ready
        const loads = graph.get(nodeId) || new Set();
        loads.forEach(loadId => {
          const newInDegree = (inDegree.get(loadId) || 0) - 1;
          inDegree.set(loadId, newInDegree);
          
          if (newInDegree === 0 && !visited.has(loadId)) {
            nextQueue.push(loadId);
          }
        });
      }
      
      if (currentLevel.length > 0) {
        levels.push(currentLevel);
      }
      
      queue.push(...nextQueue);
    }

    // Handle any remaining unvisited nodes (in case of cycles)
    equipment.forEach(eq => {
      if (!visited.has(eq.id)) {
        levels.push([eq.id]);
      }
    });

    // Generate nodes with positions
    const nodes: Node[] = [];
    const equipmentMap = new Map(equipment.map(eq => [eq.id, eq]));
    
    levels.forEach((level, levelIndex) => {
      const y = margin + levelIndex * vertSpace;
      
      // Calculate total width needed for this level based on actual node sizes
      let totalWidth = 0;
      level.forEach(equipmentId => {
        const eq = equipmentMap.get(equipmentId);
        if (eq) {
          const size = getEquipmentSize(eq.type);
          totalWidth += Math.max(size.width + 32, 120); // Add padding + minimum width
        } else {
          totalWidth += 120; // fallback width
        }
      });
      
      const startX = Math.max(margin, (window.innerWidth - totalWidth) / 2);
      let currentX = startX;
      
      level.forEach((equipmentId) => {
        const eq = equipmentMap.get(equipmentId);
        if (!eq) return;
        
        const size = getEquipmentSize(eq.type);
        const nodeWidth = Math.max(size.width + 32, 120);
        const x = currentX + nodeWidth / 2;
        currentX += nodeWidth + 20; // Add some spacing between nodes
        
        // Update equipment position
        eq.position = { x, y };
        
        nodes.push({
          id: equipmentId,
          type: 'equipmentNode',
          position: { x, y },
          data: {
            equipment: eq,
            onEdit: onEditEquipment,
          },
        });
      });
    });

    // Generate edges
    const edges: Edge[] = [];
    equipment.forEach(eq => {
      eq.loads.forEach(load => {
        edges.push({
          id: `${eq.id}-${load.id}`,
          source: eq.id,
          target: load.id,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          type: 'default',
          style: { strokeWidth: 2, stroke: '#666' },
        });
      });
    });

    return { nodes, edges };
  }, [onEditEquipment, vertSpace, nodeSpacing, margin]);

  // Generate initial nodes and edges
  const initialLayout = useMemo(() => 
    generateInitialLayout(equipmentList), 
    [equipmentList, generateInitialLayout]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialLayout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialLayout.edges);

  // Update layout when equipment list changes
  useEffect(() => {
    const newLayout = generateInitialLayout(equipmentList);
    setNodes(newLayout.nodes);
    setEdges(newLayout.edges);
  }, [equipmentList, generateInitialLayout, setNodes, setEdges]);

  // Handle node position changes to update equipment positions
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    changes.forEach(change => {
      if (change.type === 'position' && change.position && change.dragging === false) {
        // Update equipment position when node is moved
        const equipment = EquipmentBase.getById(change.id);
        if (equipment) {
          equipment.position = change.position;
        }
      }
    });
    onNodesChange(changes);
  }, [onNodesChange]);

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
        }}
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
};

export default ReactFlowLayoutEngine;