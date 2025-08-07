/**
 * Flow Layout Algorithm for Single Line Diagrams
 * 
 * This module provides functions for automatically positioning equipment nodes
 * in a single line diagram. The main algorithm places nodes based on their
 * electrical connections (sources and loads), avoiding overlaps and creating
 * a visually clear layout.
 * 
 * Key Features:
 * - Respects pre-positioned nodes (hard-set positions)
 * - Places parents above children, children below parents
 * - Uses rightmost anchor strategy for better visual flow
 * - Handles unconnected nodes with fallback positioning
 * - Collision detection and avoidance
 */

import type { HandlePosition } from '../../../types/equipment.types';

// ==============================================================================
// TYPES AND INTERFACES
// ==============================================================================

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
  width: number;
  height: number;
  name?: string;
  handles?: HandlePosition[]; // Handle positions for this equipment
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

// ==============================================================================
// UTILITY FUNCTIONS
// ==============================================================================

function getEquipmentSize(node: LayoutNode): { width: number; height: number } {
  return { width: node.width, height: node.height };
}

// ==============================================================================
// GRAPH AND EDGE GENERATION
// ==============================================================================

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
      let sourceHandle = 'bottom';
      // if the source has specific handles, use them
      if (item.handles && item.handles.length > 0) {
        const handle = item.handles.find(h => h.side === 'bottom' && h.isSource);
        if (handle) {
          sourceHandle = handle.id;
          console.log(`Using custom handle for source: ${handle.id}`);
        }
      } else if (item.type === 'Bus') {
        sourceHandle = `bottom-${loadIndex}`;
      }
      
      // Determine target handle - for bus equipment, find which source index this connection represents
      let targetHandle = 'top';
      const targetItem = items.find(i => i.id === load.id);
      if (targetItem?.handles && targetItem.handles.length > 0) {
        const handle = targetItem.handles.find(h => h.side === 'top' && !h.isSource);
        if (handle) {
          targetHandle = handle.id;
          console.log(`Using custom handle for target: ${handle.id}`);
        }
      } else if (targetItem?.type === 'Bus') {
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

// ==============================================================================
// COLLISION DETECTION AND SPACE MANAGEMENT
// ==============================================================================

/**
 * Finds an open space for a node, avoiding overlaps with existing nodes
 */
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

/**
 * Creates the initial arranged space with hard-set node positions
 * and optionally places the first node if no hard-set nodes exist
 */
function createArrangedSpace(
  items: LayoutNode[],
  options: LayoutOptions = {},
): Map<string, PositionedNode> {
  const { margin = 50 } = options;

  // Each node id with position + height + width
  const arrangedSpace: Map<string, PositionedNode> = new Map();

  // Any nodes that have a position set (not equal to {0:0})
  const hardSetNodes = items.filter(item => 
    item.position && item.position.x !== 0 && item.position.y !== 0
  );

  // Set each hardSetNode position
  hardSetNodes.forEach(point => {
    const size = getEquipmentSize(point);

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
    const size = getEquipmentSize(firstNode);
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

// ==============================================================================
// NODE POSITIONING FUNCTIONS
// ==============================================================================

/**
 * Places a child node below its parent
 */
function setChildBelowParent(
  parentAnchor: LayoutNode,
  child: LayoutNode,
  setNodes: Map<string, PositionedNode>,
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
  const size = getEquipmentSize(child);

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

/**
 * Places a parent node above its child
 */
function setParentAboveChild(
  childAnchor: LayoutNode,
  parent: LayoutNode,
  setNodes: Map<string, PositionedNode>,
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

  const size = getEquipmentSize(parent);
  
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

// ==============================================================================
// LAYOUT ALGORITHM HELPERS
// ==============================================================================

/**
 * Finds the rightmost child from arranged children
 */
function findRightmostChild(
  arrangedChildren: { id: string }[],
  arrangedSpace: Map<string, PositionedNode>
): string {
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

  return rightmostChildId;
}

/**
 * Finds the rightmost parent from arranged parents
 */
function findRightmostParent(
  arrangedParents: { id: string }[],
  arrangedSpace: Map<string, PositionedNode>
): string {
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

  return rightmostParentId;
}

/**
 * Attempts to place a single unvisited node based on its arranged connections
 */
function tryPlaceNode(
  node: LayoutNode,
  items: LayoutNode[],
  arrangedSpace: Map<string, PositionedNode>,
  options: LayoutOptions
): boolean {
  // Try to place based on arranged children (loads)
  const arrangedChildren = node.loads.filter(load => arrangedSpace.has(load.id));
  if (arrangedChildren.length > 0) {
    const rightmostChildId = findRightmostChild(arrangedChildren, arrangedSpace);
    const childAnchor = items.find(item => item.id === rightmostChildId);
    
    if (childAnchor) {
      setParentAboveChild(childAnchor, node, arrangedSpace, options);
      return true;
    }
  }

  // Try to place based on arranged parents (sources)
  const arrangedParents = node.sources.filter(source => arrangedSpace.has(source.id));
  if (arrangedParents.length > 0) {
    const rightmostParentId = findRightmostParent(arrangedParents, arrangedSpace);
    const parentAnchor = items.find(item => item.id === rightmostParentId);
    
    if (parentAnchor) {
      setChildBelowParent(parentAnchor, node, arrangedSpace, options);
      return true;
    }
  }

  return false;
}

/**
 * Places any remaining unvisited nodes in a fallback layout
 */
function placeRemainingNodes(
  unvisitedNodes: LayoutNode[],
  arrangedSpace: Map<string, PositionedNode>,
  options: LayoutOptions
): void {
  const { vertSpace = 150, nodeSpacing = 120 } = options;
  
  if (unvisitedNodes.length === 0 || arrangedSpace.size === 0) {
    return;
  }

  const topPosY = Math.min(...Array.from(arrangedSpace.values()).map(pos => pos.y)) - vertSpace;
  const topPosX = Math.min(...Array.from(arrangedSpace.values()).map(pos => pos.x));
  
  unvisitedNodes.forEach((node, index) => {
    const size = getEquipmentSize(node);
    const posNode: PositionedNode = {
      x: topPosX + (index * (size.width + nodeSpacing)),
      y: topPosY, 
      height: size.height,
      width: size.width,
      hardSet: false,
    };
    arrangedSpace.set(node.id, posNode);
  });
}

// ==============================================================================
// MAIN LAYOUT FUNCTIONS
// ==============================================================================

export function generateDescendingLayout(
  items: LayoutNode[],
  arrangedSpace: Map<string, PositionedNode>,
  options: LayoutOptions = {},
): LayoutResult {
  let unvisitedNodes = items.filter(item => !arrangedSpace.has(item.id));
  let iterationCount = 0;
  const maxIterations = items.length * 2; // Prevent infinite loops

  // Recursively find nodes adjacent to arranged nodes and position them
  while (unvisitedNodes.length > 0 && iterationCount < maxIterations) {
    iterationCount++;
    let nodesPlacedThisIteration = 0;

    // Try to place each unvisited node
    unvisitedNodes.forEach(node => {
      if (tryPlaceNode(node, items, arrangedSpace, options)) {
        nodesPlacedThisIteration++;
      }
    });

    // Update list of unvisited nodes
    unvisitedNodes = items.filter(item => !arrangedSpace.has(item.id));

    // If no nodes were placed this iteration, break to prevent infinite loop
    if (nodesPlacedThisIteration === 0) {
      break;
    }
  }

  // Place any remaining unvisited nodes in a fallback layout
  placeRemainingNodes(unvisitedNodes, arrangedSpace, options);

  // Convert positioned nodes to result format
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
  options: LayoutOptions = {},
): LayoutNode[] {
  const unsetItems = items.filter(item => 
    !item.position || (item.position.x === 0 && item.position.y === 0)
  );

  // If no items need positioning, return original items
  if (unsetItems.length === 0) {
    return items;
  }

  const arrangedSpace = createArrangedSpace(items, options);
  const layout = generateDescendingLayout(items, arrangedSpace, options);
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
