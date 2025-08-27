import type { Node, Edge } from '@xyflow/react';
import { distanceToLineSegment } from './flowPositioning';

/**
 * Finds the closest edge to a given position
 */
export const findClosestEdge = (
  position: { x: number; y: number },
  edges: Edge[],
  nodes: Node[],
  threshold: number = 50
): { edge: Edge | null; distance: number } => {
  let closestEdge: Edge | null = null;
  let minDistance = Infinity;

  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return;

    // Calculate actual handle positions for the edge endpoints
    const sourceDimensions = sourceNode.measured || { width: 100, height: 100 };
    const targetDimensions = targetNode.measured || { width: 100, height: 100 };
    
    // For step edges, the line goes from bottom center of source to top center of target
    const sourcePoint = {
      x: sourceNode.position.x + (sourceDimensions.width || 100) / 2,
      y: sourceNode.position.y + (sourceDimensions.height || 100), // bottom of source
    };
    
    const targetPoint = {
      x: targetNode.position.x + (targetDimensions.width || 100) / 2,
      y: targetNode.position.y, // top of target
    };

    // Calculate distance from position to the actual edge line segment
    const distance = distanceToLineSegment(position, sourcePoint, targetPoint);

    if (distance < minDistance && distance < threshold) {
      minDistance = distance;
      closestEdge = edge;
    }
  });

  return { edge: closestEdge, distance: minDistance };
};

/**
 * Creates edge styles with highlighting for the closest edge
 */
export const createEdgeStyle = (edgeId: string, closestEdgeId: string | null) => {
  const isClosest = edgeId === closestEdgeId;
  return {
    strokeWidth: isClosest ? 4 : 2,
    stroke: isClosest ? '#ff6b35' : '#666',
    ...(isClosest && {
      filter: 'drop-shadow(0 0 6px rgba(255, 107, 53, 0.6))',
    })
  };
};
