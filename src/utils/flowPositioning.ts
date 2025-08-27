import type { Node } from '@xyflow/react';
import { Position } from '@xyflow/react';

/**
 * Converts screen coordinates to a percentage position relative to a node handle
 */
export const convertXYToPercentPosition = (
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

/**
 * Finds a node at the specified flow position with a pixel error tolerance
 */
export const findNodeByPosition = (
  flowPosition: { x: number; y: number },
  nodes: Node[],
  pxlError: number = 10
): Node | undefined => {
  return nodes.find(node => {
    const { x, y } = node.position || {};
    const { width, height } = node.measured || {};
    const effectiveHeight = Math.max(height || 0, 30);

    const withinXBounds = width && flowPosition.x >= x - pxlError && flowPosition.x <= x + pxlError + width;
    const withinYBounds = effectiveHeight && flowPosition.y >= y - pxlError && flowPosition.y <= y + pxlError + effectiveHeight;

    return (
      x !== undefined &&
      y !== undefined &&
      withinXBounds &&
      withinYBounds
    );
  });
};

/**
 * Calculates the shortest distance from a point to a line segment
 */
export const distanceToLineSegment = (
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number }
): number => {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) {
    // Line segment is actually a point
    return Math.sqrt(A * A + B * B);
  }
  
  let param = dot / lenSq;

  let xx: number, yy: number;

  if (param < 0) {
    // Point is before the line segment
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    // Point is after the line segment
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    // Point projects onto the line segment
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;

  return Math.sqrt(dx * dx + dy * dy);
};
