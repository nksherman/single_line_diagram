import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  ConnectionMode,
} from '@xyflow/react';
import type { Node, Edge, NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import Box from '@mui/material/Box';

import ReactFlowEquipmentNode from './flowEquipmentNode';
import BusEquipmentNode from './busEquipmentNode';
import EquipmentBase from '../../../models/equipmentBase';
import Bus from '../../../models/busEquipment';

import { calculateEquipmentDimensions } from '../../../utils/equipmentDimensions';
import { setUnsetEquipmentPositions, generateEdgesFromItems, type LayoutNode } from './flowLayoutAlgorithm';
import ContextMenu from './flowContextMenu';
import { useNodeSnapping } from './flowHooks/useNodeSnapping';
import SnapLinesOverlay from './SnapLinesOverlay';

/**
 *  This function takes a list of equipment and generates a layout for them.
 *  Equipment have initially, undetermined positions and sizes.
 */

export interface FlowLayoutEngineProps {
  equipmentList: EquipmentBase[];
  onEditEquipment: (equipment: EquipmentBase) => void;
  onDeleteEquipment?: (equipment: EquipmentBase) => void;
  onConnectEquipment?: (sourceId: string, targetId: string) => boolean;
}

const ReactFlowLayoutEngine: React.FC<FlowLayoutEngineProps> = ({
  equipmentList,
  onEditEquipment,
  onDeleteEquipment,
  onConnectEquipment,
}) => {
  const vertSpace = 120; // vertical space between nodes
  const nodeSpacing = 10; // horizontal space between nodes
  const margin = 50; // margin around the edges
  const snapThreshold = 20; // snap threshold for positioning

  // Custom node types
  const nodeTypes: NodeTypes = useMemo(() => ({
    equipmentNode: ReactFlowEquipmentNode,
    busNode: BusEquipmentNode,
  }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [menu, setMenu] = useState<any | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  // Use the snapping hook
  const {
    snapLines,
    createSnappingHandler,
  } = useNodeSnapping({
    equipmentList,
    snapThreshold,
  });

  // Handle equipment resize
  const handleEquipmentResize = useCallback((equipment: EquipmentBase, width: number, _height: number) => {
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

  const handleConnect = useCallback((params: any) => {
    // Delegate to parent component to handle connection logic and state updates
    if (onConnectEquipment) {
      onConnectEquipment(params.source, params.target);
    } else {
      // Fallback: basic connection without state update
      console.warn('No onConnectEquipment handler provided');
    }
  }, [onConnectEquipment]);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    // Prevent native context menu from showing
    event.preventDefault();

    // Calculate position of the context menu. We want to make sure it
    // doesn't get positioned off-screen.
    const pane = ref.current?.getBoundingClientRect();
    if (!pane) return;

    setMenu({
      id: node.id,
      top: event.clientY < pane.height - 200 && event.clientY - pane.top,
      left: event.clientX < pane.width - 200 && event.clientX - pane.left,
      right: event.clientX >= pane.width - 200 && pane.width - (event.clientX - pane.left),
      bottom: event.clientY >= pane.height - 200 && pane.height - (event.clientY - pane.top),
    });
  }, [setMenu]);

  const onPaneClick = useCallback(() => setMenu(null), [setMenu]);

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

  // Create the snapping-aware node change handler
  const handleNodesChange = createSnappingHandler(nodes, edges, onNodesChange);

  return (
    <Box ref={ref} id="react-flow-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange ={onEdgesChange}
        nodeTypes={nodeTypes}
        onConnect={handleConnect}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={onPaneClick}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
        }}
      >
        <Controls />
        <Background />
        <SnapLinesOverlay snapLines={snapLines} />
        {menu && (
          <ContextMenu
            id={menu.id}
            top={menu.top}
            left={menu.left}
            right={menu.right}
            bottom={menu.bottom}
            equipmentList={equipmentList}
            onEdit={onEditEquipment}
            onDelete={onDeleteEquipment}
            onClick={() => setMenu(null)}
          />
        )}
      </ReactFlow>
    </Box>
  );
};

export default ReactFlowLayoutEngine;