import type { DisplayNode, DisplayConnection } from './displayAdapter';
import { calculateConnectionPaths, MultiSourcePathCalculator } from './pathingUtils';


export interface VerticalSubAssembly {

  /**
   * Vertical sub assemblies will have some relative nodes and connections,
   * with x/y postions relative to the vertical sub assembly.
   * 
   */
  id: string;
  nodes: DisplayNode[];
  connections: DisplayConnection[];
  position: { x: number; y: number }; // total position, set by layout engine
  boundPolygon: number[]; // Polygon points for the bounding box
}


export interface BusLayout {
  id: string;
  busNode: DisplayNode; // the equipment for the element
  sourceAssemblies: VerticalSubAssembly[]; // all vertical sub assemblies connected above bus
  targetAssemblies: VerticalSubAssembly[]; // all vertical sub assemblies connected below bus
  position: { x: number; y: number }; // total position, set by layout engine
}

export interface LayoutEngine {
  calculateLayout(nodes: DisplayNode[], connections: DisplayConnection[]): {
    nodes: DisplayNode[];
    connections: DisplayConnection[];
  };

}

export class TotalLayoutEngine implements LayoutEngine {
  public buses: BusLayout[] = [];
  public verticalSubAssemblies: VerticalSubAssembly[] = [];

  public busToSubAssemblies: Map<string, VerticalSubAssembly[]> = new Map();
  public subAssemblyToBus: Map<string, BusLayout> = new Map();

  constructor(
    nodes: DisplayNode[] = [],
    connections: DisplayConnection[] = []
  ) {
    
    // initialize buses and vertical sub assemblies
    this.buses = [];
    this.verticalSubAssemblies = [];

    // isolate buses and subassemblies
    const [_busNodes, subAssemblyGroups] = this.identifyGroups(nodes, connections);

    // create subassemblies from group of nodes  recursive connections error?
    for (const subAssemblyGroup of subAssemblyGroups) {
      const subAssembly = this.createVerticalSubAssembly(subAssemblyGroup, connections);
      this.verticalSubAssemblies.push(subAssembly);
    }
  }

  calculateLayout(nodes: DisplayNode[], connections: DisplayConnection[]) {
    // TODO: Implement total layout calculation
    return { nodes, connections };
  }

  private identifyGroups(_nodes: DisplayNode[], _connections: DisplayConnection[]): [DisplayNode[], DisplayNode[][]] {
    // TODO: Implement group identification logic
    // For now, return empty arrays to avoid compilation errors
    return [[], []];
  }

  private createVerticalSubAssembly(nodes: DisplayNode[], _connections: DisplayConnection[]): VerticalSubAssembly {
    // TODO: Implement vertical sub assembly creation
    return {
      id: `sub-assembly-${Date.now()}`,
      nodes,
      connections: [],
      position: { x: 0, y: 0 },
      boundPolygon: []
    };
  }
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
              const newDegree = inDegree.get(targetId)! - 1;
              inDegree.set(targetId, newDegree);
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
    
    // Group connections by target to detect multi-source scenarios
    const connectionsByTarget = new Map<string, DisplayConnection[]>();
    connections.forEach(conn => {
      const existing = connectionsByTarget.get(conn.targetId) || [];
      existing.push(conn);
      connectionsByTarget.set(conn.targetId, existing);
    });

    const processedConnections: DisplayConnection[] = [];
    const processedTargets = new Set<string>();

    connectionsByTarget.forEach((targetConnections, targetId) => {
      if (processedTargets.has(targetId)) return;
      
      if (targetConnections.length > 1) {
        // Multi-source scenario - use horizontal bus approach
        const multiSourceCalculator = new MultiSourcePathCalculator();
        const sourceNodes = targetConnections
          .map(conn => nodeMap.get(conn.sourceId))
          .filter((node): node is DisplayNode => node !== undefined);
        const targetNode = nodeMap.get(targetId);
        
        if (targetNode && sourceNodes.length > 0) {
          const multiConnections = multiSourceCalculator.calculateMultiSourcePaths(
            sourceNodes,
            [targetNode],
            { 
              routingStyle: 'rightAngle',
              verticalOffset: 15,
              minimumHorizontalExtension: 30
            }
          );
          
          // Map the generated connections back to original connection IDs
          // The multiConnections array should have the same length as sourceNodes/targetConnections
          targetConnections.forEach((originalConn, index) => {
            if (multiConnections[index]) {
              processedConnections.push({
                ...originalConn,
                points: multiConnections[index].points
              });
            }
          });
        }
        
        processedTargets.add(targetId);
      } else {
        // Single source - use standard right-angle routing
        const singleConnection = targetConnections[0];
        const standardConnections = calculateConnectionPaths(
          [singleConnection], 
          nodeMap, 
          { 
            routingStyle: 'rightAngle',
            verticalOffset: 15,
            minimumHorizontalExtension: 20
          }
        );
        
        if (standardConnections[0]) {
          processedConnections.push(standardConnections[0]);
        }
        
        processedTargets.add(targetId);
      }
    });

    return processedConnections;
  }
}
