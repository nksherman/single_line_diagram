import { useCallback, useState } from 'react';
import type { Node, Edge, NodeChange } from '@xyflow/react';
import { calculateEquipmentDimensions } from '../../../../utils/equipmentDimensions';
import EquipmentBase from '../../../../models/equipmentBase';
import Bus from '../../../../models/busEquipment';

interface UseNodeSnappingProps {
  equipmentList: EquipmentBase[];
  snapThreshold?: number;
}

interface SnapLine {
  x?: number;
  y?: number;
}

interface SnapResult {
  position: { x: number; y: number };
  snapLines: SnapLine[];
}

/**
 * Custom hook for handling node snapping functionality in ReactFlow
 * Provides snap-to-straight-edge behavior for connected nodes
 */
export function useNodeSnapping({ equipmentList, snapThreshold = 20 }: UseNodeSnappingProps) {
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);

  // Helper function to get handle center position
  const getHandleCenterPosition = useCallback((node: Node, handleId: string): { x: number; y: number } => {
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
  }, [equipmentList]);

  const snapToStraightEdge = useCallback((
    draggedNodeId: string,
    newPosition: { x: number; y: number },
    nodes: Node[],
    edges: Edge[]
  ): SnapResult => {
    const connectedEdges = edges.filter(
      edge => edge.source === draggedNodeId || edge.target === draggedNodeId
    );

    const draggedNode = nodes.find(node => node.id === draggedNodeId);
    if (!draggedNode) return { position: newPosition, snapLines: [] };

    let snappedX = newPosition.x;
    let snappedY = newPosition.y;
    const activeSnapLines: SnapLine[] = [];

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
  }, [getHandleCenterPosition, snapThreshold]);

  // Handle node position changes with snapping
  const createSnappingHandler = useCallback((
    nodes: Node[],
    edges: Edge[],
    onNodesChange: (changes: NodeChange[]) => void
  ) => {
    return (changes: NodeChange[]) => {
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
    };
  }, [snapToStraightEdge, equipmentList]);

  return {
    snapLines,
    setSnapLines,
    getHandleCenterPosition,
    snapToStraightEdge,
    createSnappingHandler,
  };
}

export default useNodeSnapping;
