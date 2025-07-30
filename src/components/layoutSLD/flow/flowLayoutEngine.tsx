import React, { useCallback, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
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
import BusEquipmentNode from './busEquipmentNode';
import EquipmentBase from '../../../models/equipmentBase';
import Bus from '../../../models/busEquipment';
import { calculateEquipmentDimensions } from '../../../utils/equipmentDimensions';

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
  const vertSpace = 120; // vertical space between nodes
  const nodeSpacing = 10; // horizontal space between nodes
  const margin = 50; // margin around the edges

  // Custom node types
  const nodeTypes: NodeTypes = useMemo(() => ({
    equipmentNode: ReactFlowEquipmentNode,
    busNode: BusEquipmentNode,
  }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Handle equipment resize
  const handleEquipmentResize = useCallback((equipment: EquipmentBase, width: number, _height: number) => {
    // Update nodes to reflect the new dimensions

    setNodes((currentNodes) => 
      currentNodes.map((node) => {
        if (node.id === equipment.id) {
          return {
            ...node,
            style: {
              ...node.style,
              width: width,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // Update layout when equipment list changes
  useEffect(() => {
    const layoutNodes: LayoutNode[] = equipmentList.map(eq => {
      // Calculate dimensions for each equipment upfront
      const dimensions = calculateEquipmentDimensions(eq);
      return {
        id: eq.id,
        type: eq.type as string,
        loads: Array.from(eq.loads).map((load: EquipmentBase) => ({ id: load.id })),
        sources: Array.from(eq.sources).map((source: EquipmentBase) => ({ id: source.id })),
        position: eq.position,
        width: dimensions.width,
        height: dimensions.height,
        name: eq.name, // used for debugging
      };
    });

    const updatedLayoutNodes = setUnsetEquipmentPositions(
      layoutNodes,
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

    const nodes: Node[] = equipmentList.map(equipment => ({
      id: equipment.id,
      type: equipment instanceof Bus ? 'busNode' : 'equipmentNode',
      position: equipment.position || { x: 0, y: 0 },
      data: {
        equipment,
        onEdit: onEditEquipment,
        onResize: handleEquipmentResize,
      },
    }));

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

  }, [equipmentList, onEditEquipment, handleEquipmentResize, vertSpace, nodeSpacing, margin, setNodes, setEdges]);

  // Handle node position changes to update equipment positions
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    changes.forEach(change => {
      if (change.type === 'position' && change.position && change.dragging === false) {
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