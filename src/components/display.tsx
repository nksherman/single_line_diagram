import { useState, useEffect }  from 'react';
import type { ReactNode } from 'react'
import { Stage, Layer, Line } from 'react-konva';
import { Box, Popover } from '@mui/material';

import { EquipmentBase } from '../models/equipmentBase';
import type { DisplayNode, DisplayConnection } from './layoutSLD/displayAdapter';
import EquipmentDisplayAdapter from './layoutSLD/displayAdapter';

import { VerticalHierarchyLayout } from './layoutSLD/layoutEngine';
import EquipmentComponent from './layoutSLD/equipmentComponent';

/**
 * Define a space for displaying equipment and connections in a single line diagram.
 * This component will render a Konva stage with various shapes representing
 * electrical equipment and connections.
 * 
 * For now, display all equipment vertically.
 */

interface PopoverPosition {
  x: number;
  y: number;
}

function Display({ equipment }: { equipment: EquipmentBase[] }) {
  const [layout, setLayout] = useState<{ nodes: DisplayNode[], connections: DisplayConnection[] }>();
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(null);
  const [popoverContent, setPopoverContent] = useState<ReactNode | null>(null);
  
  // Handle Konva-specific popover opening at mouse position
  const handleKonvaPopoverOpen = (position: PopoverPosition, content: ReactNode) => {
    setPopoverPosition(position);
    setPopoverContent(content);
  };
  
  const handleKonvaPopoverClose = () => {
    setPopoverPosition(null);
    setPopoverContent(null);
  };
  
  useEffect(() => {
    // Convert equipment to display data
    const nodes = EquipmentDisplayAdapter.toDisplayNodes(equipment);
    const connections = EquipmentDisplayAdapter.toDisplayConnections(equipment);
    
    // Calculate layout
    const layoutEngine = new VerticalHierarchyLayout();
    const calculatedLayout = layoutEngine.calculateLayout(nodes, connections);
    
    setLayout(calculatedLayout);
  }, [equipment]);
  
  if (!layout) return null;
  
  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          {/* Render connections first (behind equipment) */}
          {layout.connections.map(conn => 
            <Line key={conn.id} points={conn.points} stroke="black" />
          )}
          
          {/* Render equipment nodes */}
          {layout.nodes.map(node => 
            <EquipmentComponent key={node.id} node={node} handleKonvaPopoverOpen={handleKonvaPopoverOpen} />
          )}
        </Layer>
      </Stage>
      
      {/* Konva-specific Popover */}
      <Popover
        open={Boolean(popoverContent)}
        anchorReference="anchorPosition"
        anchorPosition={popoverPosition ? { top: popoverPosition.y, left: popoverPosition.x } : undefined}
        onClose={handleKonvaPopoverClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        disableRestoreFocus
      >
        {popoverContent}
      </Popover>
    </Box>
  );
}

export default Display;