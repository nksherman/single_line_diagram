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

import { generateFlowLayout, type LayoutNode } from './flowLayoutAlgorithm';

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

  // Generate initial layout using the extracted algorithm
  const generateInitialLayout = useCallback((equipment: EquipmentBase[]) => {
    if (equipment.length === 0) return { nodes: [], edges: [] };


    // 

    // Convert EquipmentBase to LayoutNode
    const layoutNodes: LayoutNode[] = equipment.map(eq => ({
      id: eq.id,
      type: eq.type as string,
      loads: Array.from(eq.loads).map(load => ({ id: load.id })),
      position: eq.position,
    }));

    const typeSizeMap: Record<string, { width: number; height: number }> = {
      Generator: { width: 40, height: 40 },
      Transformer: { width: 60, height: 40 },
      Bus: { width: 60, height: 4 },
      Meter: { width: 30, height: 30 },
      Switchgear: { width: 40, height: 40 },
      Breaker: { width: 30, height: 30 },
      Load: { width: 30, height: 30 },
    }

    // Generate layout
    const layout = generateFlowLayout(
      layoutNodes, 
      typeSizeMap, 
      { vertSpace,
        nodeSpacing,
        margin,
    });

    // Convert back to ReactFlow nodes and edges
    const nodes: Node[] = layout.nodes.map(layoutNode => {
      const equipment = EquipmentBase.getById(layoutNode.id);
      if (!equipment) return null;

      // Update equipment position
      equipment.position = layoutNode.position;

      return {
        id: layoutNode.id,
        type: 'equipmentNode',
        position: layoutNode.position,
        data: {
          equipment,
          onEdit: onEditEquipment,
        },
      };
    }).filter(Boolean) as Node[];

    const edges: Edge[] = layout.edges.map(layoutEdge => ({
      id: layoutEdge.id,
      source: layoutEdge.source,
      target: layoutEdge.target,
      sourceHandle: 'bottom',
      targetHandle: 'top',
      type: 'default',
      style: { strokeWidth: 2, stroke: '#666' },
    }));

    return { nodes, edges };
  }, [onEditEquipment, vertSpace, nodeSpacing, margin]);

  // positionElements with no position
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