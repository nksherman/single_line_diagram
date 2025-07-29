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

import Box from '@mui/material/Box';

import ReactFlowEquipmentNode from './flowEquipmentNode';
import EquipmentBase from '../../../models/equipmentBase';

import { setUnsetEquipmentPositions, generateEdgesFromItems, type LayoutNode } from './flowLayoutAlgorithm';

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

  // Type size mapping
  const typeSizeMap: Record<string, { width: number; height: number }> = useMemo(() => ({
    Generator: { width: 40, height: 40 },
    Transformer: { width: 60, height: 40 },
    Bus: { width: 60, height: 4 },
    Meter: { width: 30, height: 30 },
    Switchgear: { width: 40, height: 40 },
    Breaker: { width: 30, height: 30 },
    Load: { width: 30, height: 30 },
  }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Update layout when equipment list changes
  useEffect(() => {
    // Only set positions for equipment that don't have positions (x:0, y:0)
    const layoutNodes: LayoutNode[] = equipmentList.map(eq => ({
      id: eq.id,
      type: eq.type as string,
      loads: Array.from(eq.loads).map(load => ({ id: load.id })),
      sources: Array.from(eq.sources).map(source => ({ id: source.id })),
      position: eq.position,
      name: eq.name, // Optional name for debugging
    }));

    // Set positions only for unset equipment
    const updatedLayoutNodes = setUnsetEquipmentPositions(
      layoutNodes,
      typeSizeMap,
      { vertSpace, nodeSpacing, margin }
    );

    // Update equipment positions in the model
    updatedLayoutNodes.forEach(layoutNode => {
      if (layoutNode.position) {
        const equipment = equipmentList.find(eq => eq.id === layoutNode.id);

        if (equipment && (!equipment.position || (equipment.position.x === 0 && equipment.position.y === 0))) {
          equipment.position = layoutNode.position;
        }
      }
    });


    // Generate ReactFlow nodes and edges for all equipment
    const nodes: Node[] = equipmentList.map(equipment => ({
      id: equipment.id,
      type: 'equipmentNode',
      position: equipment.position || { x: 0, y: 0 },
      data: {
        equipment,
        onEdit: onEditEquipment,
      },
    }));

    // Generate edges
    const layoutEdges = generateEdgesFromItems(layoutNodes);
    const edges: Edge[] = layoutEdges.map(layoutEdge => ({
      id: layoutEdge.id,
      source: layoutEdge.source,
      target: layoutEdge.target,
      sourceHandle: layoutEdge.sourceHandle || 'bottom',
      targetHandle: layoutEdge.targetHandle || 'top',
      type: 'step',
      style: { strokeWidth: 2, stroke: '#666' },
    }));

    setNodes(nodes);
    setEdges(edges);

  }, [equipmentList, onEditEquipment, vertSpace, nodeSpacing, margin, typeSizeMap, setNodes, setEdges]);

  // Handle node position changes to update equipment positions
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    changes.forEach(change => {
      if (change.type === 'position' && change.position && change.dragging === false) {
        // Update equipment position when node is moved
        const equipment = equipmentList.find(eq => eq.id === change.id);
        if (equipment) {
          equipment.position = change.position;
        }
      }
    });
    onNodesChange(changes);

  }, [onNodesChange, equipmentList]);

  return (
    <Box style={{ width: '100%', height: '600px' }}>
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
    </Box>
  );
};

export default ReactFlowLayoutEngine;