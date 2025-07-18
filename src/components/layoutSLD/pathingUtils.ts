import type { DisplayNode, DisplayConnection } from './displayAdapter';

export interface PathingOptions {
  routingStyle: 'straight' | 'rightAngle' | 'manhattan';
  minimumHorizontalExtension?: number;
  verticalOffset?: number;
}

export interface ConnectionPoint {
  x: number;
  y: number;
}

export interface PathCalculator {
  calculatePath(
    sourceNode: DisplayNode,
    targetNode: DisplayNode,
    options?: Partial<PathingOptions>
  ): number[];
}

/**
 * Calculates straight line connection between two nodes
 */
export class StraightLinePathCalculator implements PathCalculator {
  calculatePath(
    sourceNode: DisplayNode,
    targetNode: DisplayNode,
    _options?: Partial<PathingOptions>
  ): number[] {
    // Calculate connection points (center bottom of source to center top of target)
    const sourceX = sourceNode.position.x + sourceNode.size.width / 2;
    const sourceY = sourceNode.position.y + sourceNode.size.height;
    const targetX = targetNode.position.x + targetNode.size.width / 2;
    const targetY = targetNode.position.y;
    
    return [sourceX, sourceY, targetX, targetY];
  }
}

/**
 * Calculates right-angle connection between two nodes
 */
export class RightAnglePathCalculator implements PathCalculator {
  private readonly DEFAULT_VERTICAL_OFFSET = 10;

  calculatePath(
    sourceNode: DisplayNode,
    targetNode: DisplayNode,
    options?: Partial<PathingOptions>
  ): number[] {
    const verticalOffset = options?.verticalOffset ?? this.DEFAULT_VERTICAL_OFFSET;

    // Calculate connection points
    const sourceX = sourceNode.position.x + sourceNode.size.width / 2;
    const sourceY = sourceNode.position.y + sourceNode.size.height;
    const targetX = targetNode.position.x + targetNode.size.width / 2;
    const targetY = targetNode.position.y;

    // Calculate intermediate points for right-angle path
    const midY = sourceY + Math.abs(targetY - sourceY) / 2 + verticalOffset;

    // Create path: source -> down -> horizontal -> down -> target
    const points = [
      sourceX, sourceY,           // Start at source bottom center
      sourceX, midY,              // Go down to horizontal line level
      targetX, midY,              // Go horizontally to target x position
      targetX, targetY            // Go down to target top center
    ];

    return points;
  }
}

/**
 * Calculates multi-source connection with shared horizontal bus
 */
export class MultiSourcePathCalculator {
  private readonly DEFAULT_HORIZONTAL_EXTENSION = 30;
  private readonly DEFAULT_VERTICAL_OFFSET = 15;

  calculateMultiSourcePaths(
    sourceNodes: DisplayNode[],
    targetNodes: DisplayNode[],
    options?: Partial<PathingOptions>
  ): DisplayConnection[] {
    if (sourceNodes.length === 0 || targetNodes.length === 0) {
      return [];
    }

    const horizontalExtension = options?.minimumHorizontalExtension ?? this.DEFAULT_HORIZONTAL_EXTENSION;
    const verticalOffset = options?.verticalOffset ?? this.DEFAULT_VERTICAL_OFFSET;

    // Find the bounds of all nodes
    const allNodes = [...sourceNodes, ...targetNodes];
    const minX = Math.min(...allNodes.map(node => node.position.x));
    const maxX = Math.max(...allNodes.map(node => node.position.x + node.size.width));
    const maxSourceY = Math.max(...sourceNodes.map(node => node.position.y + node.size.height));
    const minTargetY = Math.min(...targetNodes.map(node => node.position.y));

    // Calculate horizontal bus line position
    const busY = maxSourceY + Math.abs(minTargetY - maxSourceY) / 2 + verticalOffset;
    const busStartX = minX - horizontalExtension;
    const busEndX = maxX + horizontalExtension;

    const connections: DisplayConnection[] = [];

    // For multi-source to single target, create one connection per source
    // Each connection goes: source -> down -> horizontal bus -> down -> target
    if (targetNodes.length === 1) {
      const targetNode = targetNodes[0];
      const targetX = targetNode.position.x + targetNode.size.width / 2;
      const targetY = targetNode.position.y;

      sourceNodes.forEach((sourceNode, index) => {
        const sourceX = sourceNode.position.x + sourceNode.size.width / 2;
        const sourceY = sourceNode.position.y + sourceNode.size.height;

        const points = [
          sourceX, sourceY,     // Start at source bottom center
          sourceX, busY,        // Go down to bus level
          busStartX, busY,      // Go to start of horizontal bus
          busEndX, busY,        // Draw horizontal bus line
          targetX, busY,        // Go to target x position on bus
          targetX, targetY      // Go down to target top center
        ];

        connections.push({
          id: `multi-source-${index}`,
          sourceId: sourceNode.id,
          targetId: targetNode.id,
          points
        });
      });
    }

    return connections;
  }
}

/**
 * Factory function to create appropriate path calculator
 */
export function createPathCalculator(routingStyle: PathingOptions['routingStyle']): PathCalculator {
  switch (routingStyle) {
    case 'straight':
      return new StraightLinePathCalculator();
    case 'rightAngle':
    case 'manhattan':
      return new RightAnglePathCalculator();
    default:
      return new StraightLinePathCalculator();
  }
}

/**
 * Utility function to calculate paths for multiple connections
 */
export function calculateConnectionPaths(
  connections: DisplayConnection[],
  nodeMap: Map<string, DisplayNode>,
  options?: Partial<PathingOptions>
): DisplayConnection[] {
  const pathCalculator = createPathCalculator(options?.routingStyle ?? 'rightAngle');

  return connections.map(conn => {
    const sourceNode = nodeMap.get(conn.sourceId);
    const targetNode = nodeMap.get(conn.targetId);
    
    if (!sourceNode || !targetNode) {
      return { ...conn, points: [] };
    }
    
    const points = pathCalculator.calculatePath(sourceNode, targetNode, options);
    return { ...conn, points };
  });
}
