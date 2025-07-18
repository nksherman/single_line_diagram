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
    
    // Create shared node map that will be updated throughout the process
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    
    // Position nodes in layers (updates the shared nodeMap)
    this.positionNodesInLayers(nodeMap, layers);
    
    // Calculate connection paths (uses and updates the shared nodeMap)
    const positionedConnections = this.calculateConnectionPaths(connections, nodeMap);

    // adjust the buses based on the new connections
    this.adjustBusNodes(positionedConnections, nodeMap);

    // Convert map back to array for final result
    const finalNodes = Array.from(nodeMap.values());

    return { nodes: finalNodes, connections: positionedConnections };
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

  private positionNodesInLayers(nodeMap: Map<string, DisplayNode>, layers: string[][]): void {
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
          // Update the node in the shared map
          nodeMap.set(nodeId, {
            ...node,
            position: { x: currentX, y }
          });
          currentX += node.size.width + this.NODE_SPACING;
        }
      });
    });
  }

  private adjustBusNodes(positionedConnections: DisplayConnection[], nodeMap: Map<string, DisplayNode>): void {
    const busNodes = Array.from(nodeMap.values()).filter(node => node.type === 'Bus');

    busNodes.forEach(busNode => {
      // Find all connections for this bus
      const connections = positionedConnections.filter(conn => conn.sourceId === busNode.id || conn.targetId === busNode.id);
      
      if (connections.length > 0) {
        // Calculate the required width based on connections
        const minWidth = 60; // Minimum width for a bus
        const connectionWidths = connections.map(conn => {
          const sourceNode = nodeMap.get(conn.sourceId);
          const targetNode = nodeMap.get(conn.targetId);
          
          if (sourceNode && targetNode) {
            return Math.abs(sourceNode.position.x - targetNode.position.x) + Math.max(sourceNode.size.width, targetNode.size.width);
          }
          return 0;
        });

        const requiredWidth = Math.max(minWidth, ...connectionWidths) * 3 / 5;

        // Update the bus node size and position
        busNode.size.width = requiredWidth;
        busNode.position.x -= (requiredWidth - busNode.size.width) / 2; // Center the bus
      }
    });
    
    // updated nodeMap
  }

  private calculateConnectionPaths(
    connections: DisplayConnection[], 
    nodeMap: Map<string, DisplayNode>
  ): DisplayConnection[] {
    // Separate bus connections from regular connections
    const busConnections: DisplayConnection[] = [];
    const regularConnections: DisplayConnection[] = [];
    
    connections.forEach(conn => {
      const sourceNode = nodeMap.get(conn.sourceId);
      const targetNode = nodeMap.get(conn.targetId);
      
      if (sourceNode?.type === 'Bus' || targetNode?.type === 'Bus') {
        busConnections.push(conn);
      } else {
        regularConnections.push(conn);
      }
    }); 
    
    // Process bus connections with straight vertical lines
    const processedBusConnections = this.calculateBusConnectionPaths(busConnections, nodeMap);
    
    // Process regular connections with existing logic
    const processedRegularConnections = this.calculateRegularConnectionPaths(regularConnections, nodeMap);
    
    return [...processedBusConnections, ...processedRegularConnections];
  }

  private calculateBusConnectionPaths(
      connections: DisplayConnection[],
      nodeMap: Map<string, DisplayNode>
    ): DisplayConnection[] {
      // Group connections by bus node to handle each bus separately
      const connectionsByBus = new Map<string, DisplayConnection[]>();
      
      connections.forEach(conn => {
        const sourceNode = nodeMap.get(conn.sourceId);
        const targetNode = nodeMap.get(conn.targetId);
        
        let busNodeId: string;
        if (sourceNode?.type === 'Bus') {
          busNodeId = sourceNode.id;
        } else if (targetNode?.type === 'Bus') {
          busNodeId = targetNode.id;
        } else {
          return; // Skip if neither is a bus
        }
        
        const existing = connectionsByBus.get(busNodeId) || [];
        existing.push(conn);
        connectionsByBus.set(busNodeId, existing);
      });
  
      const processedConnections: DisplayConnection[] = [];
  
      // Process each bus and its connections
      connectionsByBus.forEach((busConnections, busNodeId) => {
        const busNode = nodeMap.get(busNodeId);
        if (!busNode) return;
  
        // Calculate all connection points for this bus
        const connectionXPositions: number[] = [];
        
        busConnections.forEach(conn => {
          const sourceNode = nodeMap.get(conn.sourceId);
          const targetNode = nodeMap.get(conn.targetId);
          
          if (sourceNode?.type === 'Bus') {
            // Bus is source - use target's X position
            const targetX = targetNode!.position.x + targetNode!.size.width / 2;
            connectionXPositions.push(targetX);
          } else if (targetNode?.type === 'Bus') {
            // Bus is target - use source's X position
            const sourceX = sourceNode!.position.x + sourceNode!.size.width / 2;
            connectionXPositions.push(sourceX);
          }
        });
  
        // Calculate the required bus dimensions and position
        const minX = Math.min(...connectionXPositions);
        const maxX = Math.max(...connectionXPositions);
        const minBusWidth = 60; // Minimum bus width
        const padding = 20; // Padding on each side of the bus
        
        // Calculate new bus position and width
        const requiredWidth = Math.max(minBusWidth, maxX - minX + (padding * 2));
        const newBusX = minX - padding;
        
        // Update the bus node in the nodeMap
        const updatedBusNode = {
          ...busNode,
          position: { x: newBusX, y: busNode.position.y },
          size: { width: requiredWidth, height: busNode.size.height }
        };
        nodeMap.set(busNodeId, updatedBusNode);
  
        // Now calculate connection paths with the updated bus dimensions
        busConnections.forEach(conn => {
          const sourceNode = nodeMap.get(conn.sourceId);
          const targetNode = nodeMap.get(conn.targetId);
          
          if (!sourceNode || !targetNode) {
            processedConnections.push({ ...conn, points: [] });
            return;
          }
          
          let points: number[];
          
          if (sourceNode.type === 'Bus') {
            // Bus is source - straight vertical line from bus to target
            const targetX = targetNode.position.x + targetNode.size.width / 2;
            const busY = updatedBusNode.position.y + updatedBusNode.size.height;
            const targetY = targetNode.position.y;
            
            points = [targetX, busY, targetX, targetY];
          } else if (targetNode.type === 'Bus') {
            // Bus is target - straight vertical line from source to bus
            const sourceX = sourceNode.position.x + sourceNode.size.width / 2;
            const sourceY = sourceNode.position.y + sourceNode.size.height;
            const busY = updatedBusNode.position.y;
            
            points = [sourceX, sourceY, sourceX, busY];
          } else {
            // Fallback - shouldn't happen with current logic
            points = [];
          }
          
          processedConnections.push({ ...conn, points });
        });
      });
  
      return processedConnections;
    }

  private calculateRegularConnectionPaths(
    connections: DisplayConnection[],
    nodeMap: Map<string, DisplayNode>
  ): DisplayConnection[] {
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
