interface Position {
  x: number
  y: number
}

interface PositionedNode extends Position {
  height: number;
  width: number;
  hardSet: boolean;
}


export interface LayoutNode {
  id: string;
  type: string;
  loads: { id: string }[];
  sources: { id: string }[];
  position?: { x: number; y: number };
  name?: string;
}

export interface LayoutOptions {
  vertSpace?: number;
  nodeSpacing?: number;
  margin?: number;
  containerWidth?: number;
}

export interface LayoutResult {
  nodes: Array<{
    id: string;
    position: { x: number; y: number };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
  }>;
}

export interface DependencyGraph {
  graph: Map<string, Set<string>>;
  inDegree: Map<string, number>;
}

function getEquimentSize(type: string, typeSizeMap: Record<string, { width: number; height: number }>): { width: number; height: number } {
  return typeSizeMap[type] || { width: 40, height: 40 };
}

// Core graph building functions
export function buildDependencyGraph(items: LayoutNode[]): DependencyGraph {
  // Graph is a map of node IDs to sets of connected load IDs
  // In-degree is a map of node IDs to their incoming connection counts
  const graph = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  items.forEach(item => {
    graph.set(item.id, new Set());
    inDegree.set(item.id, 0);
  });

  items.forEach(item => {
    item.loads.forEach(load => {
      graph.get(item.id)?.add(load.id);
      inDegree.set(load.id, (inDegree.get(load.id) || 0) + 1);
    });
  });

  return { graph, inDegree };
}

// Topological sorting functions
export function findSourceNodes(items: LayoutNode[], inDegree: Map<string, number>): string[] {
  const sources = items
    .filter(item => inDegree.get(item.id) === 0)
    .map(item => item.id);
  
  // Fallback: if no sources found, pick the first node
  if (sources.length === 0 && items.length > 0) {
    sources.push(items[0].id);
  }
  
  return sources;
}

export function performTopologicalSort(
  graph: Map<string, Set<string>>,
  inDegree: Map<string, number>,
  sourceNodes: string[]
): string[][] {
  const levels: string[][] = [];
  const queue: string[] = [...sourceNodes];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentLevel: string[] = [];
    const nextQueue: string[] = [];
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      
      currentLevel.push(nodeId);
      visited.add(nodeId);
      
      // Reduce in-degree for all loads and add to next level if ready
      const loads = graph.get(nodeId) || new Set();
      loads.forEach(loadId => {
        const newInDegree = (inDegree.get(loadId) || 0) - 1;
        inDegree.set(loadId, newInDegree);
        
        if (newInDegree === 0 && !visited.has(loadId)) {
          nextQueue.push(loadId);
        }
      });
    }
    
    if (currentLevel.length > 0) {
      levels.push(currentLevel);
    }
    
    queue.push(...nextQueue);
  }

  return levels;
}

export function handleUnvisitedNodes(items: LayoutNode[], visited: Set<string>): string[][] {
  const unvisitedLevels: string[][] = [];
  
  items.forEach(item => {
    if (!visited.has(item.id)) {
      unvisitedLevels.push([item.id]);
    }
  });
  
  return unvisitedLevels;
}

// Position calculation functions
export function calculateLevelWidth(
  level: string[],
  itemMap: Map<string, LayoutNode>,
  typeSizeMap: Record<string, { width: number; height: number }>
): number {
  let totalWidth = 0;
  
  level.forEach(itemId => {
    const item = itemMap.get(itemId);
    if (item) {
      const size = typeSizeMap[item.type] || { width: 40, height: 40 };
      totalWidth += Math.max(size.width + 32, 120); // Add padding + minimum width
    } else {
      totalWidth += 120; // fallback width
    }
  });
  
  return totalWidth;
}

export function positionNodesInLevel(
  level: string[],
  levelIndex: number,
  itemMap: Map<string, LayoutNode>,
  typeSizeMap: Record<string, { width: number; height: number }>,
  options: Required<Pick<LayoutOptions, 'vertSpace' | 'margin' | 'containerWidth'>>
): Array<{ id: string; position: { x: number; y: number } }> {
  const { vertSpace, margin, containerWidth } = options;
  const y = margin + levelIndex * vertSpace;
  
  const totalWidth = calculateLevelWidth(level, itemMap, typeSizeMap);
  const startX = Math.max(margin, (containerWidth - totalWidth) / 2);
  let currentX = startX;
  
  const positions: Array<{ id: string; position: { x: number; y: number } }> = [];
  
  level.forEach((itemId) => {
    const item = itemMap.get(itemId);
    if (!item) return;
    
    const size = typeSizeMap[item.type] || { width: 40, height: 40 };
    const nodeWidth = Math.max(size.width + 32, 120);
    const x = currentX + nodeWidth / 2;
    currentX += nodeWidth + 20; // Add some spacing between nodes
    
    positions.push({
      id: itemId,
      position: { x, y },
    });
  });
  
  return positions;
}

export function generateEdgesFromItems(items: LayoutNode[]): Array<{
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}> {
  const edges: Array<{ 
    id: string; 
    source: string; 
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
  }> = [];
  
  // Create a map to track source connections for each target node
  const targetSourceMap = new Map<string, string[]>();
  
  // First pass: build the map of all connections
  items.forEach(item => {
    item.loads.forEach(load => {
      if (!targetSourceMap.has(load.id)) {
        targetSourceMap.set(load.id, []);
      }
      targetSourceMap.get(load.id)!.push(item.id);
    });
  });
  
  items.forEach(item => {
    item.loads.forEach((load, loadIndex) => {
      // Determine source handle based on equipment type
      let sourceHandle = 'bottom';
      if (item.type === 'Bus') {
        sourceHandle = `bottom-${loadIndex}`;
      }
      
      // Determine target handle - for bus equipment, find which source index this connection represents
      let targetHandle = 'top';
      const targetItem = items.find(i => i.id === load.id);
      if (targetItem?.type === 'Bus') {
        // Find the index of this source connection in the target bus's sources
        const targetSources = targetSourceMap.get(load.id) || [];
        const sourceIndex = targetSources.indexOf(item.id);
        if (sourceIndex >= 0) {
          targetHandle = `top-${sourceIndex}`;
        }
      }
      
      edges.push({
        id: `${item.id}-${load.id}`,
        source: item.id,
        target: load.id,
        sourceHandle,
        targetHandle,
      });
    });
  });

  return edges;
}

export function generateFlowLayout(
  items: LayoutNode[],
  typeSizeMap: Record<string, { width: number; height: number }>,
  options: LayoutOptions = {},
): LayoutResult {
  const {
    vertSpace = 150,
    nodeSpacing = 120,
    margin = 50,
    containerWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
  } = options;

  if (items.length === 0) return { nodes: [], edges: [] };

  // Build dependency graph
  const { graph, inDegree } = buildDependencyGraph(items);
  
  // Find source nodes and perform topological sort
  const sourceNodes = findSourceNodes(items, inDegree);
  const levels = performTopologicalSort(graph, inDegree, sourceNodes);
  
  // Handle any unvisited nodes (cycles)
  const visited = new Set(levels.flat());
  const unvisitedLevels = handleUnvisitedNodes(items, visited);
  const allLevels = [...levels, ...unvisitedLevels];

  // Generate node positions
  const itemMap = new Map(items.map(item => [item.id, item]));
  const nodes: LayoutResult['nodes'] = [];
  
  allLevels.forEach((level, levelIndex) => {
    const levelPositions = positionNodesInLevel(
      level,
      levelIndex,
      itemMap,
      typeSizeMap,
      { vertSpace, margin, containerWidth }
    );
    nodes.push(...levelPositions);
  });
  // Generate edges
  const edges = generateEdgesFromItems(items);

  return { nodes, edges };
}

function getOpenSpace(
  x: number,
  y: number,
  arrangedSpace: Map<string, PositionedNode>,
  thisSize: { width: number; height: number },
  nodeSpacing: number = 20,
): Position {

  let overlap = true;
  while (overlap) {
    overlap = false;
    for (const [_, pos] of arrangedSpace.entries()) {
      if (pos.x < x + thisSize.width &&
          pos.x + pos.width > x &&
          pos.y < y + thisSize.height &&
          pos.y + pos.height > y) {
        // Overlap detected, move to the right of offending object
        x = pos.x + pos.width + nodeSpacing;
        overlap = true;
        break;
      }
    }
  }
  
  // Return the final non-overlapping position
  return { x, y };
}

function createArrangedSpace(
  items: LayoutNode[],
  typeSizeMap: Record<string, { width: number; height: number }>,
  options: LayoutOptions = {},
): Map<string, PositionedNode> {
  const {
    vertSpace = 150,
    nodeSpacing = 120,  
    margin = 50,
  } = options;

  // Each node id with position + height + width
  const arrangedSpace: Map<string, PositionedNode> = new Map();

  // Any nodes that have a position set (not equal to {0:0})
  const hardSetNodes = items.filter(item => 
    item.position && item.position.x !== 0 && item.position.y !== 0
  );

  // Set each hardSetNode position
  hardSetNodes.forEach(point => {
    const size = getEquimentSize(point.type, typeSizeMap);

    // hardSetNodes have a defined position, so we can use it directly
    const posNode: PositionedNode = {
      x: point.position!.x,
      y: point.position!.y,
      height: size.height,
      width: size.width,
      hardSet: true,
    };

    arrangedSpace.set(point.id, posNode);
  });

  // If no hardSetNodes, set the first node to the margin position
  if (hardSetNodes.length === 0 && items.length > 0) {
    const firstNode = items[0];
    const size = getEquimentSize(firstNode.type, typeSizeMap);
    const posNode: PositionedNode = {
      x: margin,
      y: margin,
      height: size.height,
      width: size.width,
      hardSet: false,
    };
    arrangedSpace.set(firstNode.id, posNode);
  }

  return arrangedSpace;
}


function setChildBelowParent(
  parentAnchor: LayoutNode,
  child: LayoutNode,
  setNodes: Map<string, PositionedNode>,
  typeSizeMap: Record<string, { width: number; height: number }>,
  options: LayoutOptions,
): Map<string, PositionedNode> {
  const {
    vertSpace = 150,
    nodeSpacing = 120,
  } = options;

  const parentPosition = setNodes.get(parentAnchor.id);
  if (!parentPosition) {
    throw new Error(`Parent node ${parentAnchor.id} position not set`);
  }

  // Only set if child not already set
  if (setNodes.has(child.id)) {
    return setNodes;
  }

  // Calculate the position for the child below the parent
  const yOffset = parentPosition.y + parentPosition.height + vertSpace;
  const size = getEquimentSize(child.type, typeSizeMap);

  const foundPos = getOpenSpace(
    parentPosition.x, // Start directly below parent
    yOffset,
    setNodes,
    size,
    nodeSpacing
  );

  const newPosition: PositionedNode = {
    x: foundPos.x,
    y: foundPos.y,
    height: size.height,
    width: size.width,
    hardSet: false,
  };
  setNodes.set(child.id, newPosition);

  return setNodes;
}

function setParentAboveChild(
  childAnchor: LayoutNode,
  parent: LayoutNode,
  setNodes: Map<string, PositionedNode>,
  typeSizeMap: Record<string, { width: number; height: number }>,
  options: LayoutOptions,
): Map<string, PositionedNode> {
  const {
    vertSpace = 150,
    nodeSpacing = 120,
  } = options;

  const childPosition = setNodes.get(childAnchor.id);
  if (!childPosition) {
    throw new Error(`Child node ${childAnchor.id} position not set`);
  }

  // Only set if parent not already set
  if (setNodes.has(parent.id)) {
    return setNodes;
  }

  const size = getEquimentSize(parent.type, typeSizeMap);
  
  // Calculate the position for the parent above the child
  const yOffset = childPosition.y - vertSpace - size.height;

  const foundPos = getOpenSpace(
    childPosition.x, // Start directly above child
    yOffset,
    setNodes,
    size,
    nodeSpacing
  );

  const newPosition: PositionedNode = {
    x: foundPos.x,
    y: foundPos.y,
    height: size.height,
    width: size.width,
    hardSet: false,
  };
  setNodes.set(parent.id, newPosition);

  return setNodes;
}


export function generateDescendingLayout(
  items: LayoutNode[],
  arrangedSpace: Map<string, PositionedNode>,
  typeSizeMap: Record<string, { width: number; height: number }>,
  options: LayoutOptions = {},
): LayoutResult {
  const {
    vertSpace = 150,
    nodeSpacing = 120,
    margin = 50,
  } = options;

  let unvisitedNodes = items.filter(item => !arrangedSpace.has(item.id));
  let iterationCount = 0;
  const maxIterations = items.length * 2; // Prevent infinite loops

  // Recursively find nodes adjacent to arranged nodes and position them
  while (unvisitedNodes.length > 0 && iterationCount < maxIterations) {
    iterationCount++;
    let nodesPlacedThisIteration = 0;

    unvisitedNodes.forEach(node => {
      const arrangedChildren = node.loads.filter(load => arrangedSpace.has(load.id));
      if (arrangedChildren.length > 0) {

        // get the right most child for the anchor
        let maxChildX = -Infinity;
        let rightmostChildId = arrangedChildren[0].id; // fallback to first child

        arrangedChildren.forEach(load => {
          const childPos = arrangedSpace.get(load.id);
          if (childPos) {
            const childRightX = childPos.x + childPos.width;
            if (childRightX > maxChildX) {
              maxChildX = childRightX;
              rightmostChildId = load.id;
            }
          }
        });

        const childAnchor = items.find(item => item.id === rightmostChildId);

        if (childAnchor) {
          setParentAboveChild(childAnchor, node, arrangedSpace, typeSizeMap, options);
          nodesPlacedThisIteration++;
        }
      } else {
        const arrangedParents = node.sources.filter(source => arrangedSpace.has(source.id));

        if (arrangedParents.length > 0) {

          let maxParentX = -Infinity;
          let rightmostParentId = arrangedParents[0].id; // fallback to first parent

          arrangedParents.forEach(parent => {
            const parentPos = arrangedSpace.get(parent.id);
            if (parentPos) {
              const parentRightX = parentPos.x + parentPos.width;
              if (parentRightX > maxParentX) {
                maxParentX = parentRightX;
                rightmostParentId = parent.id;
              }
            }
          });

          const parentAnchor = items.find(item => item.id === rightmostParentId);

          if (parentAnchor) {
            setChildBelowParent(parentAnchor, node, arrangedSpace, typeSizeMap, options);
            nodesPlacedThisIteration++;
          }
        }
      }
    });

    unvisitedNodes = items.filter(item => !arrangedSpace.has(item.id));

    // If no nodes were placed this iteration, break to prevent infinite loop
    if (nodesPlacedThisIteration === 0) {
      break;
    }
  }

  // Handle any remaining unvisited nodes at the bottom
  const topPosY = Math.min(...Array.from(arrangedSpace.values()).map(pos => pos.y)) - vertSpace;
  const topPosX = Math.min(...Array.from(arrangedSpace.values()).map(pos => pos.x));
  unvisitedNodes.forEach((node, index) => {
    const size = getEquimentSize(node.type, typeSizeMap);
    const posNode: PositionedNode = {
      x: topPosX + (index * (size.width + nodeSpacing)),
      y: topPosY, 
      height: size.height,
      width: size.width,
      hardSet: false,
    };
    arrangedSpace.set(node.id, posNode);
  });

  const nodes: LayoutResult['nodes'] = Array.from(arrangedSpace.entries()).map(([id, pos]) => ({
    id,
    position: { x: pos.x, y: pos.y }
  }));

  const edges = generateEdgesFromItems(items);

  return { nodes, edges };
}

/**
 * Sets positions only for equipment that don't have positions set (x:0, y:0)
 * This is more efficient than re-running the entire layout algorithm
 */
export function setUnsetEquipmentPositions(
  items: LayoutNode[],
  typeSizeMap: Record<string, { width: number; height: number }>,
  options: LayoutOptions = {},
): LayoutNode[] {
  const unsetItems = items.filter(item => 
    !item.position || (item.position.x === 0 && item.position.y === 0)
  );

  // If no items need positioning, return original items
  if (unsetItems.length === 0) {
    return items;
  }

  const arrangedSpace = createArrangedSpace(items, typeSizeMap, options);
  const layout = generateDescendingLayout(items, arrangedSpace, typeSizeMap, options);
  const positionMap = new Map(layout.nodes.map(node => [node.id, node.position]));

  // Return updated items with new positions
  return items.map(item => {
    const newPosition = positionMap.get(item.id);
    if (newPosition) {
      return { ...item, position: newPosition };
    }
    return item;
  });
}
