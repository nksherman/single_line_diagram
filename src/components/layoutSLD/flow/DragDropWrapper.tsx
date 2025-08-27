import React, { useCallback, useState, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import Box from '@mui/material/Box';

import DragDropHelper from '../dragDrop/dragDropHelper';
import type { EquipmentType } from '../../../types/equipment.types';
import { findClosestEdge } from '../../../utils/edgeUtils';

interface DragDropWrapperProps {
  children: React.ReactNode;
  nodes: Node[];
  edges: Edge[];
  layoutOffsets: {
    sidebarWidth: number;
    drawerWidth: number;
    headerHeight: number;
  };
  onCreateEquipment?: (type: EquipmentType, sourceId: string, targetId: string) => void;
  onClosestEdgeChange?: (edgeId: string | null) => void;
  onMousePositionChange?: (position: { x: number; y: number } | null) => void;
  onDragActiveChange?: (isDragActive: boolean) => void;
}

const DragDropWrapper: React.FC<DragDropWrapperProps> = ({
  children,
  nodes,
  edges,
  layoutOffsets,
  onCreateEquipment,
  onClosestEdgeChange,
  onMousePositionChange,
  onDragActiveChange,
}) => {
  const reactFlowInstance = useReactFlow();
  const [isDragActive, setIsDragActive] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const screenToFlowPosition = useCallback(({ x, y }: { x: number; y: number }) => {
    // Calculate dynamic adjustments based on layout offsets
    const adjustedScreenPosition = {
      x: x + layoutOffsets.sidebarWidth + layoutOffsets.drawerWidth,
      y: y + layoutOffsets.headerHeight
    };
    return reactFlowInstance.screenToFlowPosition(adjustedScreenPosition);
  }, [layoutOffsets, reactFlowInstance]);

  // Update mouse position during drag events
  const updateMousePositionFromDragEvent = useCallback((event: React.DragEvent) => {
    const reactFlowBounds = ref.current?.getBoundingClientRect();
    if (!reactFlowBounds) return;

    const flowPosition = screenToFlowPosition({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    onMousePositionChange?.(flowPosition);
  }, [screenToFlowPosition, onMousePositionChange]);

  // Mouse position tracking for debugging
  const onMouseMove = useCallback((event: React.MouseEvent) => {
    const reactFlowBounds = ref.current?.getBoundingClientRect();
    if (!reactFlowBounds) return;

    const flowPosition = screenToFlowPosition({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    onMousePositionChange?.(flowPosition);
  }, [screenToFlowPosition, onMousePositionChange]);

  // Drag and drop handlers
  const onDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(true);
    onDragActiveChange?.(true);
    updateMousePositionFromDragEvent(event);
  }, [updateMousePositionFromDragEvent, onDragActiveChange]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragActive(true);
    onDragActiveChange?.(true);
    updateMousePositionFromDragEvent(event);
    
    // Find closest edge for highlighting while dragging
    const reactFlowBounds = ref.current?.getBoundingClientRect();
    if (reactFlowBounds) {
      const position = screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      
      const { edge } = findClosestEdge(position, edges, nodes);
      onClosestEdgeChange?.(edge?.id || null);
    }
  }, [updateMousePositionFromDragEvent, screenToFlowPosition, edges, nodes, onClosestEdgeChange, onDragActiveChange]);

  const onDragLeave = useCallback((event: React.DragEvent) => {
    // Only set to false if leaving the container entirely
    const rect = ref.current?.getBoundingClientRect();
    if (rect && (
      event.clientX < rect.left || 
      event.clientX > rect.right || 
      event.clientY < rect.top || 
      event.clientY > rect.bottom
    )) {
      setIsDragActive(false);
      onDragActiveChange?.(false);
      onClosestEdgeChange?.(null);
    }
  }, [onClosestEdgeChange, onDragActiveChange]);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragActive(false);
    onDragActiveChange?.(false);
    onClosestEdgeChange?.(null);
    updateMousePositionFromDragEvent(event);

    const equipmentType = event.dataTransfer.getData('application/equipment-type') as EquipmentType;
    if (!equipmentType) return;

    // Get the position where the drop occurred
    const reactFlowBounds = ref.current?.getBoundingClientRect();
    if (!reactFlowBounds) return;

    const position = screenToFlowPosition({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    // Find the edge closest to the drop position
    const { edge: closestEdge } = findClosestEdge(position, edges, nodes);
    if (closestEdge && onCreateEquipment) {
      onCreateEquipment(equipmentType, closestEdge.source, closestEdge.target);
    }
  }, [screenToFlowPosition, edges, nodes, onCreateEquipment, updateMousePositionFromDragEvent, onClosestEdgeChange, onDragActiveChange]);

  return (
    <Box 
      ref={ref} 
      id="react-flow-container" 
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onMouseMove={onMouseMove}
    >
      <DragDropHelper isDragActive={isDragActive} />
      {children}
    </Box>
  );
};

export default DragDropWrapper;
