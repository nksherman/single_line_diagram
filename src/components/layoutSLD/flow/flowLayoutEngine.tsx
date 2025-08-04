import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  ConnectionMode,
  useReactFlow,
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
import ContextMenu from './flowContextMenu'

/**
 *  This function takes a list of equipment and generates a layout for them.
 *  Equipment have initially, undetermined positions and sizes.
 */

export interface FlowLayoutEngineProps {
  equipmentList: EquipmentBase[];
  onEditEquipment: (equipment: EquipmentBase) => void;
  onDeleteEquipment?: (equipment: EquipmentBase) => void;
}

const ReactFlowLayoutEngine: React.FC<FlowLayoutEngineProps> = ({
  equipmentList,
  onEditEquipment,
  onDeleteEquipment,
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
  const [snapLines, setSnapLines] = useState<Array<{x?: number, y?: number}>>([]);
  const [menu, setMenu] = useState<any | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  // Create a wrapper component that has access to ReactFlow context
  const SnapLinesOverlay: React.FC = () => {
    const reactFlow = useReactFlow();
    
    return (
      <>
        {snapLines.map((line, index) => {
          if (line.x !== undefined) {
            // Vertical line - convert world coordinate to screen coordinate
            const viewport = reactFlow.getViewport();
            const screenX = (line.x * viewport.zoom) + viewport.x;
            return (
              <Box
                key={index}
                sx={{
                  position: 'absolute',
                  backgroundColor: '#ff6b6b',
                  opacity: 0.8,
                  pointerEvents: 'none',
                  zIndex: 1000,
                  left: screenX,
                  top: 0,
                  width: 2,
                  height: '100%',
                }}
              />
            );
          } else if (line.y !== undefined) {
            // Horizontal line - convert world coordinate to screen coordinate
            const viewport = reactFlow.getViewport();
            const screenY = (line.y * viewport.zoom) + viewport.y;
            return (
              <Box
                key={index}
                sx={{
                  position: 'absolute',
                  backgroundColor: '#ff6b6b',
                  opacity: 0.8,
                  pointerEvents: 'none',
                  zIndex: 1000,  
                  left: 0,
                  top: screenY,
                  width: '100%',
                  height: 2,
                }}
              />
            );
          }
          return null;
        })}
      </>
    );
  };

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

  const handleConnect = useCallback((params: any) => {
    console.log('onConnect', params);
  }, []);

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

  // Helper function to get handle center position
  const getHandleCenterPosition = (node: Node, handleId: string): { x: number; y: number } => {
    if (!node.position) return { x: 0, y: 0 };
    
    // Get node dimensions
    const equipment = equipmentList.find(eq => eq.id === node.id);
    const dimensions = equipment ? calculateEquipmentDimensions(equipment) : { width: 100, height: 50 };
    
    const nodeCenter = {
      x: node.position.x + dimensions.width / 2,
      y: node.position.y + dimensions.height / 2
    };

    // Calculate handle position based on handle ID
    if (handleId.startsWith('top')) {
      let handleX = nodeCenter.x; // Default to center
      
      // For bus nodes with multiple handles, calculate position based on handle index
      if (equipment instanceof Bus && handleId.includes('-')) {
        const handleIndex = parseInt(handleId.split('-')[1]);
        const handlesCount = equipment.sources?.size || 1;
        // Position handles evenly across the width: left at ((i + 1) / (handlesCount + 1)) * 100%
        handleX = node.position.x + ((handleIndex + 1) / (handlesCount + 1)) * dimensions.width;
      }
      
      return {
        x: handleX,
        y: node.position.y
      };
    } else if (handleId.startsWith('bottom')) {
      let handleX = nodeCenter.x; // Default to center
      
      // For bus nodes with multiple handles, calculate position based on handle index
      if (equipment instanceof Bus && handleId.includes('-')) {
        const handleIndex = parseInt(handleId.split('-')[1]);
        const handlesCount = equipment.loads?.size || 1;
        // Position handles evenly across the width
        handleX = node.position.x + ((handleIndex + 1) / (handlesCount + 1)) * dimensions.width;
      }
      
      return {
        x: handleX,
        y: node.position.y + dimensions.height
      };
    } else if (handleId.startsWith('left')) {
      return {
        x: node.position.x,
        y: nodeCenter.y
      };
    } else if (handleId.startsWith('right')) {
      return {
        x: node.position.x + dimensions.width,
        y: nodeCenter.y
      };
    }
    
    // Default to node center
    return nodeCenter;
  };

  const snapToStraightEdge = (
    draggedNodeId: string,
    newPosition: { x: number; y: number },
    nodes: Node[],
    edges: Edge[]
  ): { position: { x: number; y: number }, snapLines: Array<{x?: number, y?: number}> } => {
    const connectedEdges = edges.filter(
      edge => edge.source === draggedNodeId || edge.target === draggedNodeId
    );

    const draggedNode = nodes.find(node => node.id === draggedNodeId);
    if (!draggedNode) return { position: newPosition, snapLines: [] };

    let snappedX = newPosition.x;
    let snappedY = newPosition.y;
    const activeSnapLines: Array<{x?: number, y?: number}> = [];

    connectedEdges.forEach(edge => {
      const connectedNodeId = edge.source === draggedNodeId ? edge.target : edge.source;
      const connectedNode = nodes.find(node => node.id === connectedNodeId);
      
      if (connectedNode && connectedNode.position) {
        // Determine which handles are being connected
        const draggedHandleId = edge.source === draggedNodeId ? edge.sourceHandle || 'bottom' : edge.targetHandle || 'top';
        const connectedHandleId = edge.source === draggedNodeId ? edge.targetHandle || 'top' : edge.sourceHandle || 'bottom';
        
        // Get the connected node's handle center position
        const connectedHandlePos = getHandleCenterPosition(connectedNode, connectedHandleId);
        
        // Calculate where the dragged node's handle would be with the new position
        const draggedHandlePos = getHandleCenterPosition(
          { ...draggedNode, position: newPosition },
          draggedHandleId
        );

        // Snap horizontally to align handles vertically (for vertical edges)
        const xDiff = Math.abs(draggedHandlePos.x - connectedHandlePos.x);
        if (xDiff < snapThreshold) {
          // Calculate the node position needed to align the handles
          const handleOffsetX = draggedHandlePos.x - newPosition.x;
          snappedX = connectedHandlePos.x - handleOffsetX;
          activeSnapLines.push({ x: connectedHandlePos.x });
        }

        // Snap vertically to align handles horizontally (for horizontal edges)
        const yDiff = Math.abs(draggedHandlePos.y - connectedHandlePos.y);
        if (yDiff < snapThreshold) {
          // Calculate the node position needed to align the handles
          const handleOffsetY = draggedHandlePos.y - newPosition.y;
          snappedY = connectedHandlePos.y - handleOffsetY;
          activeSnapLines.push({ y: connectedHandlePos.y });
        }
      }
    });

    return { position: { x: snappedX, y: snappedY }, snapLines: activeSnapLines };
  };

  // Handle node position changes to update equipment positions
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    const updatedChanges = changes.map(change => {
      if (change.type === 'position' && change.position) {
        if (change.dragging === true) {
          // Apply snapping while dragging
          const result = snapToStraightEdge(
            change.id,
            change.position,
            nodes,
            edges
          );
          
          setSnapLines(result.snapLines);
          
          return {
            ...change,
            position: result.position,
          };
        } else if (change.dragging === false) {
          // Apply snapping one final time when dragging ends and save the position
          const result = snapToStraightEdge(
            change.id,
            change.position,
            nodes,
            edges
          );
          
          // Clear snap lines when dragging ends
          setSnapLines([]);
          
          // Update equipment position with the final snapped position
          const equipment = equipmentList.find(eq => eq.id === change.id);
          if (equipment) {
            equipment.position = result.position;
          }
          
          return {
            ...change,
            position: result.position,
          };
        }
      }
      return change;
    });
    
    onNodesChange(updatedChanges);
  }, [onNodesChange, equipmentList, nodes, edges]);

  return (
    <Box ref={ref} style={{ width: '100%', height: '100%', position: 'relative' }}>
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
        <SnapLinesOverlay />
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