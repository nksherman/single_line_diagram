import type { DisplayNode, DisplayConnection } from './displayAdapter';

export interface LayoutEngine {
  calculateLayout(nodes: DisplayNode[], connections: DisplayConnection[]): {
    nodes: DisplayNode[];
    connections: DisplayConnection[];
  };
}

export class VerticalHierarchyLayout implements LayoutEngine {
  private readonly LAYER_SPACING = 100; // Vertical spacing between layers
  private readonly NODE_SPACING = 80;   // Horizontal spacing between nodes in same layer
  private readonly MARGIN = 50;         // Margin from edges

  calculateLayout(nodes: DisplayNode[], connections: DisplayConnection[]) {
    // Build dependency graph
    const graph = this.buildGraph(nodes, connections);
    
    // Topological sort for vertical layers
    const layers = this.topologicalSort(graph);
    
    // Position nodes in layers
    const positionedNodes = this.positionNodesInLayers(nodes, layers);
    
    // Calculate connection paths
    const positionedConnections = this.calculateConnectionPaths(connections, positionedNodes);
    
    return { nodes: positionedNodes, connections: positionedConnections };
  }

  private buildGraph(nodes: DisplayNode[], connections: DisplayConnection[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();
    
    // Initialize graph with all nodes
    nodes.forEach(node => {
      graph.set(node.id, new Set());
    });
    
    // Add edges (sources -> loads)
    connections.forEach(conn => {
      const sources = graph.get(conn.sourceId);
      if (sources) {
        sources.add(conn.targetId);
      }
    });
    
    return graph;
  }

  private topologicalSort(graph: Map<string, Set<string>>): string[][] {
    const inDegree = new Map<string, number>();
    const layers: string[][] = [];
    
    // Calculate in-degrees
    graph.forEach((_, nodeId) => {
      inDegree.set(nodeId, 0);
    });
    
    graph.forEach(targets => {
      targets.forEach(targetId => {
        inDegree.set(targetId, (inDegree.get(targetId) || 0) + 1);
      });
    });
    
    // Process nodes layer by layer
    while (inDegree.size > 0) {
      const currentLayer: string[] = [];
      
      // Find nodes with no incoming edges
      const noIncomingEdges: string[] = [];
      inDegree.forEach((degree, nodeId) => {
        if (degree === 0) {
          noIncomingEdges.push(nodeId);
        }
      });
      
      if (noIncomingEdges.length === 0) {
        // Handle cycles by taking remaining nodes
        inDegree.forEach((_, nodeId) => {
          currentLayer.push(nodeId);
        });
        inDegree.clear();
      } else {
        // Process nodes with no incoming edges
        noIncomingEdges.forEach(nodeId => {
          currentLayer.push(nodeId);
          inDegree.delete(nodeId);
          
          // Reduce in-degree of connected nodes
          const targets = graph.get(nodeId) || new Set();
          targets.forEach(targetId => {
            if (inDegree.has(targetId)) {
              inDegree.set(targetId, inDegree.get(targetId)! - 1);
            }
          });
        });
      }
      
      if (currentLayer.length > 0) {
        layers.push(currentLayer);
      }
    }
    
    return layers;
  }

  private positionNodesInLayers(nodes: DisplayNode[], layers: string[][]): DisplayNode[] {
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    const positionedNodes: DisplayNode[] = [];
    
    layers.forEach((layer, layerIndex) => {
      const y = this.MARGIN + layerIndex * this.LAYER_SPACING;
      
      // Calculate total width needed for this layer
      const totalNodeWidth = layer.reduce((sum, nodeId) => {
        const node = nodeMap.get(nodeId);
        return sum + (node?.size.width || 0);
      }, 0);
      
      const totalSpacing = (layer.length - 1) * this.NODE_SPACING;
      const totalWidth = totalNodeWidth + totalSpacing;
      
      // Center the layer horizontally
      let currentX = this.MARGIN + Math.max(0, (800 - totalWidth) / 2); // Assume canvas width of 800
      
      layer.forEach(nodeId => {
        const node = nodeMap.get(nodeId);
        if (node) {
          const positionedNode: DisplayNode = {
            ...node,
            position: { x: currentX, y }
          };
          positionedNodes.push(positionedNode);
          currentX += node.size.width + this.NODE_SPACING;
        }
      });
    });
    
    return positionedNodes;
  }

  private calculateConnectionPaths(
    connections: DisplayConnection[], 
    positionedNodes: DisplayNode[]
  ): DisplayConnection[] {
    const nodeMap = new Map(positionedNodes.map(node => [node.id, node]));
    
    return connections.map(conn => {
      const sourceNode = nodeMap.get(conn.sourceId);
      const targetNode = nodeMap.get(conn.targetId);
      
      if (!sourceNode || !targetNode) {
        return { ...conn, points: [] };
      }
      
      // Calculate connection points (center bottom of source to center top of target)
      const sourceX = sourceNode.position.x + sourceNode.size.width / 2;
      const sourceY = sourceNode.position.y + sourceNode.size.height;
      const targetX = targetNode.position.x + targetNode.size.width / 2;
      const targetY = targetNode.position.y;
      
      // Simple straight line connection
      const points = [sourceX, sourceY, targetX, targetY];
      
      return { ...conn, points };
    });
  }
}