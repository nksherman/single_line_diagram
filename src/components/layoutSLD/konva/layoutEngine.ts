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
    
    // Pre-calculate bus sizes based on their connections before positioning
    this.precalculateBusSizes(nodeMap, connections, layers);
    
    // Position nodes in layers (updates the shared nodeMap)
    this.positionNodesInLayers(nodeMap, layers, connections);
    
    // Calculate connection paths (uses and updates the shared nodeMap)
    const positionedConnections = this.calculateConnectionPaths(connections, nodeMap);

    // Convert map back to array for final result
    const finalNodes = Array.from(nodeMap.values());

    // Debug logging
    this.debugLayout(finalNodes, positionedConnections, layers);

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

  private _calculateNodeWidth(node: DisplayNode): number {
    // Calculate width based on node type and content

    let width = node?.size.width || 0;

    if (node.textElements && node.textElements.length > 0) {
      // get the max width left and right
      const charWidth = 6;

      width += node.textElements
        .filter(textElement => textElement.position.startsWith('left'))
        .reduce((max, textElement) => Math.max(max, textElement.text.length * charWidth), 0);

      width += node.textElements
        .filter(textElement => textElement.position.startsWith('right'))
        .reduce((max, textElement) => Math.max(max, textElement.text.length * charWidth), 0);

    }

    return width;
  }

  private precalculateBusSizes(
    nodeMap: Map<string, DisplayNode>, 
    connections: DisplayConnection[], 
    layers: string[][]
  ): void {
    // Create a temporary positioning to estimate bus requirements
    const tempNodeMap = new Map(nodeMap);
    
    // Do a preliminary positioning using the old simple method to get approximate positions
    this.positionNodesInLayersSimple(tempNodeMap, layers);
    
    // Find all bus nodes
    const busNodes = Array.from(nodeMap.values()).filter(node => node.type === 'Bus');
    
    busNodes.forEach(busNode => {
      // Find all connections for this bus
      const busConnections = connections.filter(conn => 
        conn.sourceId === busNode.id || conn.targetId === busNode.id
      );
      
      if (busConnections.length > 0) {
        // Calculate connection X positions using the temporary positioning
        const connectionXPositions: number[] = [];
        
        busConnections.forEach(conn => {
          const tempSourceNode = tempNodeMap.get(conn.sourceId);
          const tempTargetNode = tempNodeMap.get(conn.targetId);
          
          if (tempSourceNode?.type === 'Bus') {
            // Bus is source - use target's X position
            const targetX = tempTargetNode!.position.x + tempTargetNode!.size.width / 2;
            connectionXPositions.push(targetX);
          } else if (tempTargetNode?.type === 'Bus') {
            // Bus is target - use source's X position
            const sourceX = tempSourceNode!.position.x + tempSourceNode!.size.width / 2;
            connectionXPositions.push(sourceX);
          }
        });
        
        if (connectionXPositions.length > 0) {
          // Calculate required bus width
          const minX = Math.min(...connectionXPositions);
          const maxX = Math.max(...connectionXPositions);
          const minBusWidth = 60; // Minimum bus width
          const padding = 20; // Padding on each side of the bus
          
          const requiredWidth = Math.max(minBusWidth, maxX - minX + (padding * 2));
          
          // Update the bus node size in the actual nodeMap
          const updatedBusNode = {
            ...busNode,
            size: { width: requiredWidth, height: busNode.size.height }
          };
          
          nodeMap.set(busNode.id, updatedBusNode);
        }
      }
    });
  }

  private positionNodesInLayersSimple(nodeMap: Map<string, DisplayNode>, layers: string[][]): void {
    layers.forEach((layer, layerIndex) => {
      const y = this.MARGIN + layerIndex * this.LAYER_SPACING;
      
      // Calculate total width needed for this layer
      const totalNodeWidth = layer.reduce((sum, nodeId) => {
        const node = nodeMap.get(nodeId);
        return sum + (node ? this._calculateNodeWidth(node) : 0);
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
          currentX += this._calculateNodeWidth(node) + this.NODE_SPACING;
        }
      });
    });
  }

  private positionNodesInLayers(
    nodeMap: Map<string, DisplayNode>, 
    layers: string[][],
    connections: DisplayConnection[]
  ): void {
    // Build parent-child relationships from connections
    const parentToChildren = new Map<string, string[]>();
    const childToParent = new Map<string, string>();
    
    // Build relationships from the connections
    connections.forEach(conn => {
      // Add child to parent's children list
      const children = parentToChildren.get(conn.sourceId) || [];
      children.push(conn.targetId);
      parentToChildren.set(conn.sourceId, children);
      
      // Set parent for child
      childToParent.set(conn.targetId, conn.sourceId);
    });

    layers.forEach((layer, layerIndex) => {
      const y = this.MARGIN + layerIndex * this.LAYER_SPACING;
      
      // Separate nodes into those with parents in previous layers and those without
      const nodesWithParents: string[] = [];
      const nodesWithoutParents: string[] = [];
      
      layer.forEach(nodeId => {
        const parentId = childToParent.get(nodeId);
        const parentNode = parentId ? nodeMap.get(parentId) : null;
        
        // Check if parent is in a previous layer (already positioned)
        if (parentNode && parentNode.position.x !== undefined) {
          nodesWithParents.push(nodeId);
        } else {
          nodesWithoutParents.push(nodeId);
        }
      });
      
      // First, position nodes without parents using the original centering logic
      if (nodesWithoutParents.length > 0) {
        this.positionNodesWithoutParents(nodeMap, nodesWithoutParents, y);
      }
      
      // Then, position nodes with parents to align with their parents
      if (nodesWithParents.length > 0) {
        this.positionChildrenWithParents(nodeMap, nodesWithParents, childToParent, y);
      }
    });
  }

  private positionNodesWithoutParents(
    nodeMap: Map<string, DisplayNode>, 
    nodeIds: string[], 
    y: number
  ): void {
    if (nodeIds.length === 0) return;

    // Calculate total width needed for nodes without parents
    const totalNodeWidth = nodeIds.reduce((sum, nodeId) => {
      const node = nodeMap.get(nodeId);
      return sum + (node ? this._calculateNodeWidth(node) : 0);
    }, 0);
    
    const totalSpacing = (nodeIds.length - 1) * this.NODE_SPACING;
    const totalWidth = totalNodeWidth + totalSpacing;
    
    // Get all existing nodes in this layer to avoid overlaps
    const existingNodes = Array.from(nodeMap.values()).filter(node => 
      Math.abs(node.position.y - y) < 10 && !nodeIds.includes(node.id)
    );
    
    // Calculate available space considering existing nodes
    let startX = this.MARGIN;
    
    if (existingNodes.length > 0) {
      // Find the rightmost existing node
      const rightmostX = Math.max(...existingNodes.map(node => 
        node.position.x + this._calculateNodeWidth(node)
      ));
      startX = rightmostX + this.NODE_SPACING;
    } else {
      // Center horizontally if no existing nodes
      startX = this.MARGIN + Math.max(0, (800 - totalWidth) / 2);
    }
    
    // Position nodes
    let currentX = startX;
    nodeIds.forEach(nodeId => {
      const node = nodeMap.get(nodeId);
      if (node) {
        // Update the node in the shared map
        nodeMap.set(nodeId, {
          ...node,
          position: { x: currentX, y }
        });
        currentX += this._calculateNodeWidth(node) + this.NODE_SPACING;
      }
    });
  }

  private positionChildrenWithParents(
    nodeMap: Map<string, DisplayNode>,
    nodesWithParents: string[],
    childToParent: Map<string, string>,
    y: number
  ): void {
    // Group children by their parent
    const childrenByParent = new Map<string, string[]>();
    
    nodesWithParents.forEach(nodeId => {
      const parentId = childToParent.get(nodeId);
      if (parentId) {
        const siblings = childrenByParent.get(parentId) || [];
        siblings.push(nodeId);
        childrenByParent.set(parentId, siblings);
      }
    });

    // Position each group of siblings
    childrenByParent.forEach((childrenIds, parentId) => {
      const parentNode = nodeMap.get(parentId);
      if (!parentNode) return;

      if (childrenIds.length === 1) {
        // Single child - center with parent
        const childId = childrenIds[0];
        const child = nodeMap.get(childId);
        if (child) {
          const parentCenterX = parentNode.position.x + parentNode.size.width / 2;
          const childX = parentCenterX - this._calculateNodeWidth(child) / 2;
          
          nodeMap.set(childId, {
            ...child,
            position: { x: childX, y }
          });
        }
      } else {
        // Multiple children - distribute them across the parent's width with spacing
        const children = childrenIds.map(id => nodeMap.get(id)).filter(Boolean) as DisplayNode[];
        
        // Calculate total width needed for all children
        const totalChildrenWidth = children.reduce((sum, child) => sum + this._calculateNodeWidth(child), 0);
        const totalSpacing = (children.length - 1) * this.NODE_SPACING;
        const totalRequiredWidth = totalChildrenWidth + totalSpacing;
        
        // Calculate starting X position to center the group under the parent
        const parentCenterX = parentNode.position.x + parentNode.size.width / 2;
        let startX = parentCenterX - totalRequiredWidth / 2;
        
        // If the children extend beyond the parent's bounds, we need to handle this
        // For now, let's ensure minimum spacing but keep them roughly centered
        const minX = parentNode.position.x - totalRequiredWidth / 2;
        startX = Math.max(startX, minX);
        
        // Position each child
        let currentX = startX;
        children.forEach((child, index) => {
          const childId = childrenIds[index];
          nodeMap.set(childId, {
            ...child,
            position: { x: currentX, y }
          });
          currentX += this._calculateNodeWidth(child) + this.NODE_SPACING;
        });
      }
    });
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
  
        // Calculate the bus position based on connection points and pre-calculated width
        if (connectionXPositions.length > 0) {
          const minX = Math.min(...connectionXPositions);
          const padding = 20;
          
          // Calculate new bus position (width was already set in precalculateBusSizes)
          const newBusX = minX - padding;
          
          // Update the bus node position in the nodeMap
          const updatedBusNode = {
            ...busNode,
            position: { x: newBusX, y: busNode.position.y }
          };

          nodeMap.set(busNodeId, updatedBusNode);
        }
  
        // Calculate connection paths with the positioned bus
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
            const busY = sourceNode.position.y + sourceNode.size.height;
            const targetY = targetNode.position.y;
            
            points = [targetX, busY, targetX, targetY];
          } else if (targetNode.type === 'Bus') {
            // Bus is target - straight vertical line from source to bus
            const sourceX = sourceNode.position.x + sourceNode.size.width / 2;
            const sourceY = sourceNode.position.y + sourceNode.size.height;
            const busY = targetNode.position.y;
            
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

  private debugLayout(nodes: DisplayNode[], connections: DisplayConnection[], layers: string[][]): void {
    console.log('=== LAYOUT DEBUG ===');
    console.log('Layers:', layers);
    
    layers.forEach((layer, index) => {
      console.log(`\nLayer ${index}:`);
      layer.forEach(nodeId => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
          console.log(`  ${node.id} (${node.type}): x=${node.position.x.toFixed(1)}, y=${node.position.y.toFixed(1)}, width=${node.size.width}, height=${node.size.height}`);
        }
      });
    });

    console.log('\nConnections:');
    connections.forEach(conn => {
      const sourceNode = nodes.find(n => n.id === conn.sourceId);
      const targetNode = nodes.find(n => n.id === conn.targetId);
      console.log(`  ${conn.sourceId} -> ${conn.targetId} (${sourceNode?.type} -> ${targetNode?.type})`);
      if (conn.points.length > 0) {
        console.log(`    Points: [${conn.points.join(', ')}]`);
      }
    });

    // Check for overlaps
    console.log('\nOverlap Detection:');
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        
        const overlapX = (nodeA.position.x < nodeB.position.x + nodeB.size.width) && 
                        (nodeB.position.x < nodeA.position.x + nodeA.size.width);
        const overlapY = (nodeA.position.y < nodeB.position.y + nodeB.size.height) && 
                        (nodeB.position.y < nodeA.position.y + nodeA.size.height);
        
        if (overlapX && overlapY) {
          console.log(`  OVERLAP: ${nodeA.id} and ${nodeB.id}`);
          console.log(`    ${nodeA.id}: x=${nodeA.position.x}-${nodeA.position.x + nodeA.size.width}, y=${nodeA.position.y}-${nodeA.position.y + nodeA.size.height}`);
          console.log(`    ${nodeB.id}: x=${nodeB.position.x}-${nodeB.position.x + nodeB.size.width}, y=${nodeB.position.y}-${nodeB.position.y + nodeB.size.height}`);
        }
      }
    }
    console.log('=== END DEBUG ===');
  }
}
