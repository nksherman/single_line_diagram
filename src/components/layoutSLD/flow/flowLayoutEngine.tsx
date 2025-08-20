import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  ConnectionMode,
  useReactFlow,
} from '@xyflow/react';
import type { Node, Edge, NodeTypes } from '@xyflow/react';
import { Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import Box from '@mui/material/Box';

import EquipmentNode from './equipmentNode';
import BusEquipmentNode from './busEquipmentNode';
import EquipmentBase from '../../../models/equipmentBase';
import Bus from '../../../models/busEquipment';

import { calculateEquipmentDimensions } from '../../../utils/equipmentDimensions';
import { setUnsetEquipmentPositions, generateEdgesFromItems, type LayoutNode } from './flowLayoutAlgorithm';

import { type CustomFlowNode } from './equipmentNode';
import NodeContextMenu from './nodeContextMenu';
import EdgeContextMenu from './edgeContextMenu';
import { useNodeSnapping } from './nodeSnap/useNodeSnapping';
import SnapLinesOverlay from './nodeSnap/SnapLinesOverlay';

/**
 *  This function takes a list of equipment and generates a layout for them.
 *  Equipment have initially, undetermined positions and sizes.
 */

export interface FlowLayoutEngineProps {
  equipmentList: EquipmentBase[];
  triggerRerender?: () => void; // Optional callback to trigger a re-render
  onEditEquipment: (equipment: EquipmentBase) => void;
  onDeleteEquipment?: (equipment: EquipmentBase) => void;
  onConnectEquipment?: (sourceId: string, targetId: string) => boolean;
  onDeleteConnection?: (sourceId: string, targetId: string) => void;
}

const FlowLayoutEngineCore: React.FC<FlowLayoutEngineProps> = ({
  equipmentList,
  triggerRerender,
  onEditEquipment,
  onDeleteEquipment,
  onConnectEquipment,
  onDeleteConnection,
}) => {
  // You can access the internal React Flow state here
  const reactFlowInstance = useReactFlow(); // eslint-disable-line @typescript-eslint/no-unused-vars

  const vertSpace = 120; // vertical space between nodes
  const nodeSpacing = 10; // horizontal space between nodes
  const margin = 50; // margin around the edges
  const snapThreshold = 20; // snap threshold for positioning

  // Custom node types
  const nodeTypes: NodeTypes = useMemo(() => ({
    equipmentNode: EquipmentNode,
    busNode: BusEquipmentNode,
  }), []);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [nodeResizeModes, setNodeResizeModes] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState<{
    id: string;
    type: 'node' | 'edge';
    node?: CustomFlowNode;
    source?: Node;
    target?: Node;
    top?: number | false;
    left?: number | false;
    right?: number | false;
    bottom?: number | false;
  } | null>(null);
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
  const handleEquipmentResize = useCallback((equipment: EquipmentBase, width: number, _: number) => {
    // height ignored because we use this for buses
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

  // Handle toggle resize mode for individual nodes
  const handleToggleResizeMode = useCallback((equipmentId: string) => {
    setNodeResizeModes(prev => ({
      ...prev,
      [equipmentId]: !prev[equipmentId]
    }));
  }, []);

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
        handles: eq.handles ? [...eq.handles] : undefined, // Include handle positions
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
        isResizeMode: nodeResizeModes[equipment.id] || false,
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

  }, [equipmentList, onEditEquipment, handleEquipmentResize, vertSpace, nodeSpacing, margin, nodeResizeModes, setNodes, setEdges]);

  // Create the snapping-aware node change handler
  const handleNodesChange = createSnappingHandler(nodes, edges, onNodesChange);

  /**
   * Node Connections
   */

  // helper to get node from screen coordinates
  const findNodeByPosition = useCallback((flowPosition: { x: number; y: number }) => {
    const currNodes = reactFlowInstance.getNodes();

    const pxlError = 10 ; // Amount allowable to mix node

    return currNodes.find(node => {
      const { x, y } = node.position || {};
      const { width, height } = node.measured || {};
      const effectiveHeight = Math.max(height || 0, 50);

      const withinXBounds = width && flowPosition.x >= x - pxlError && flowPosition.x <= x + pxlError + width;
      const withinYBounds = effectiveHeight && flowPosition.y >= y - pxlError - effectiveHeight && flowPosition.y <= y + pxlError;

      return (
        x !== undefined &&
        y !== undefined &&
        withinXBounds &&
        withinYBounds
      );
    });

  }, [reactFlowInstance]);

  const convertXYToPercentPosition = (
    node: Node, 
    xyPosition: { x: number; y: number }, 
    handleSide: Position
  ): number => {
    const nodePos = node.position;
    const nodeDimensions = node.measured || { width: 100, height: 100 }; // fallback dimensions
    
    const relativeX = xyPosition.x - nodePos.x;
    const relativeY = xyPosition.y - nodePos.y;
    
    switch (handleSide) {
      case Position.Top:
      case Position.Bottom:
        return Math.max(0, Math.min(100, (relativeX / (nodeDimensions.width || 100) * 100)));
      
      case Position.Left:
      case Position.Right:
        return Math.max(0, Math.min(100, (relativeY / (nodeDimensions.height || 100) * 100)));
      
      default:
        return 50;
    }
  };

  const repositionHandle = useCallback((
    equipmentId: string, 
    handleId: string, 
    newPositionPercent: number
  ) => {

    const equipment = equipmentList.find(eq => eq.id === equipmentId);
    if (!equipment) {
      console.warn(`Equipment with ID ${equipmentId} not found`);
      return;
    }

    const currentHandle = equipment.getHandle(handleId);
    if (!currentHandle) {
      console.warn(`Handle with ID ${handleId} not found on equipment ${equipmentId}`);
      return;
    }
    currentHandle.positionPercent = newPositionPercent;

    if (triggerRerender) {
      triggerRerender();
      console.log(`Repositioned handle ${handleId} of equipment ${equipmentId} to ${newPositionPercent}%`);
    }
  }, [equipmentList, triggerRerender]);

  const handleConnect = useCallback((params: any) => {
    if (onConnectEquipment) {
      onConnectEquipment(params.source, params.target);
    } else {
      // Fallback: basic connection without state update
      console.warn('No onConnectEquipment handler provided');
    }
  }, [onConnectEquipment]);

  const handleConnectEnd = useCallback((_event: any, params: any) => {
    if (params.toNode) {
      return; {/* handleConnect is already working */}
    }
    const adjustedScreenPosition = {
      x: params.to.x + 60,
      y: params.to.y - 30  
    };
    const flowPosition = reactFlowInstance.screenToFlowPosition(adjustedScreenPosition);

    const targetNode = findNodeByPosition(flowPosition);
    if (!targetNode) {
      // user dragged to no where
      return;
    }

    if (targetNode.id === params.fromNode.id) {
      const fromHandleId = params.fromHandle?.id || params.fromHandle;

      const equipment = EquipmentBase.getById(targetNode.id);
      if (!equipment) {
        console.warn(`Equipment with ID ${targetNode.id} not found`);
        return;
      }

      const handle = equipment.getHandle(fromHandleId);
      if (!handle) {
        console.warn(`Handle with ID ${fromHandleId} not found`);
        console.log('Available handles:', equipment.handles.map(h => h.id));
        return;
      }

      const newPositionPercent = convertXYToPercentPosition(
        targetNode, 
        flowPosition, 
        handle.side
      );

      repositionHandle(targetNode.id, fromHandleId, newPositionPercent);
    } else {
      // user dragged to a different node, create a new connection
      params.target = targetNode.id;
      handleConnect(params);
    }

  }, [findNodeByPosition, repositionHandle, handleConnect]);

  const handleDeleteEdge = useCallback((edgeId: string) => {
    // Parse the edge ID to get source and target
    // Edge IDs are typically in format "source-target" based on the generateEdgesFromItems function
    const edge = edges.find(e => e.id === edgeId);

    const {source, target} = edge || {};
    if (!source || !target) {
      console.warn(`Edge with ID ${edgeId} not found or invalid.`);
      return;
    }
    if (edge && onDeleteConnection) {
      onDeleteConnection(source, target);
    } else {
      console.warn(`Edge with ID ${edgeId} not found or no onDeleteConnection handler provided.`, edge);
    }
  }, [edges, onDeleteConnection]);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    // Prevent native context menu from showing
    event.preventDefault();

    // Calculate position of the context menu. We want to make sure it
    // doesn't get positioned off-screen.
    const pane = ref.current?.getBoundingClientRect();
    if (!pane) return;

    setMenu({
      id: node.id,
      type: 'node',
      node: node as CustomFlowNode, // Type assertion since we know this is our custom node
      top: event.clientY < pane.height - 200 && event.clientY - pane.top,
      left: event.clientX < pane.width - 200 && event.clientX - pane.left,
      right: event.clientX >= pane.width - 200 && pane.width - (event.clientX - pane.left),
      bottom: event.clientY >= pane.height - 200 && pane.height - (event.clientY - pane.top),
    });
  }, [setMenu]);

  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    // Prevent native context menu from showing
    event.preventDefault();

    // Calculate position of the context menu. We want to make sure it
    // doesn't get positioned off-screen.
    const pane = ref.current?.getBoundingClientRect();
    if (!pane) return;

    setMenu({
      id: edge.id,
      type: 'edge',
      source: nodes.find(n => n.id === edge.source),
      target: nodes.find(n => n.id === edge.target),
      top: event.clientY < pane.height - 200 && event.clientY - pane.top,
      left: event.clientX < pane.width - 200 && event.clientX - pane.left,
      right: event.clientX >= pane.width - 200 && pane.width - (event.clientX - pane.left),
      bottom: event.clientY >= pane.height - 200 && pane.height - (event.clientY - pane.top),
    });
  }, [nodes, setMenu]);

  const onPaneClick = useCallback(() => setMenu(null), [setMenu]);

  return (
    <Box ref={ref} id="react-flow-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange ={onEdgesChange}
        nodeTypes={nodeTypes}
        onConnect={handleConnect}
        onConnectEnd={handleConnectEnd}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
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
        {menu && menu.type === 'node' && (
          <NodeContextMenu
            id={menu.id}
            top={menu.top}
            left={menu.left}
            right={menu.right}
            bottom={menu.bottom}
            node={menu.node}
            onEdit={onEditEquipment}
            onDelete={onDeleteEquipment}
            onClose={() => setMenu(null)}
            triggerRerender={triggerRerender}
            onToggleResizeMode={handleToggleResizeMode}
          />
        )}
        {menu && menu.type === 'edge' && (
          <EdgeContextMenu
            id={menu.id}
            top={menu.top}
            left={menu.left}
            right={menu.right}
            bottom={menu.bottom}
            onDeleteEdge={handleDeleteEdge}
            onClick={() => setMenu(null)}
          />
        )}
      </ReactFlow>
    </Box>
  );
};

// Wrapping with ReactFlowProvider is done outside of the core component
const ReactFlowLayoutEngine: React.FC<FlowLayoutEngineProps> = (props) => {
  return (
    <ReactFlowProvider>
      <FlowLayoutEngineCore {...props} />
    </ReactFlowProvider>
  );
};

export default ReactFlowLayoutEngine;