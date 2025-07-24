export interface LayoutNode {
  id: string;
  type: string;
  loads: { id: string }[];
  position?: { x: number; y: number };
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
  }>;
}

export interface DependencyGraph {
  graph: Map<string, Set<string>>;
  inDegree: Map<string, number>;
}

// Core graph building functions
export function buildDependencyGraph(items: LayoutNode[]): DependencyGraph {
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
}> {
  const edges: Array<{ id: string; source: string; target: string }> = [];
  
  items.forEach(item => {
    item.loads.forEach(load => {
      edges.push({
        id: `${item.id}-${load.id}`,
        source: item.id,
        target: load.id,
      });
    });
  });
  
  return edges;
}

// Main layout function - now much simpler
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

// Alternative layout algorithms can now reuse these building blocks
export function generateGridLayout(
  items: LayoutNode[],
  typeSizeMap: Record<string, { width: number; height: number }>,
  options: LayoutOptions & { columns?: number } = {}
): LayoutResult {
  const {
    nodeSpacing = 120,
    margin = 50,
    columns = Math.ceil(Math.sqrt(items.length))
  } = options;

  const nodes: LayoutResult['nodes'] = [];
  
  items.forEach((item, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    
    nodes.push({
      id: item.id,
      position: {
        x: margin + col * nodeSpacing,
        y: margin + row * nodeSpacing
      }
    });
  });

  const edges = generateEdgesFromItems(items);
  
  return { nodes, edges };
}