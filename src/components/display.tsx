import { useState, useEffect }  from 'react';
import type { ReactNode } from 'react'
import { Stage, Layer, Line } from 'react-konva';
import { Box, Popover } from '@mui/material';

import { EquipmentBase } from '../models/equipmentBase';

import type { DisplayNode, DisplayConnection } from './layoutSLD/displayAdapter';
import EquipmentDisplayAdapter from './layoutSLD/displayAdapter';
import { VerticalHierarchyLayout } from './layoutSLD/layoutEngine';
import EquipmentComponent from './layoutSLD/equipmentComponent';

import EditEquipment from './editEquipment';

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

function Display({ equipmentList, setEquipmentList, handlePopoverOpen }: { 
  equipmentList: EquipmentBase[]; setEquipmentList: (eq: EquipmentBase[]) => void; handlePopoverOpen: (content: ReactNode, anchorElement: HTMLElement | null) => void }) {
  const [layout, setLayout] = useState<{ nodes: DisplayNode[], connections: DisplayConnection[] }>();
  const [popoverPositionKonva, setPopoverPositionKonva] = useState<PopoverPosition | null>(null);
  const [popoverContentKonva, setPopoverContentKonva] = useState<ReactNode | null>(null);

  // Handle Konva-specific popover opening at mouse position
  const handleKonvaPopoverOpen = (position: PopoverPosition, content: ReactNode) => {
    setPopoverPositionKonva(position);
    setPopoverContentKonva(content);
  };

  const handleKonvaPopoverClose = () => {
    setPopoverPositionKonva(null);
    setPopoverContentKonva(null);
  };

  const handleEditEquipment = (equipmentSubject: EquipmentBase) => {
    // Handle editing of equipment properties
    const editContent = (
      <EditEquipment
        equipmentSubject={equipmentSubject}
        setEquipmentList={setEquipmentList}
        equipmentList={equipmentList}
      />
    );

    handlePopoverOpen(editContent, null);
    handleKonvaPopoverClose();
  }
  
  useEffect(() => {
    // Convert equipment to display data
    const nodes = EquipmentDisplayAdapter.toDisplayNodes(equipmentList);
    const connections = EquipmentDisplayAdapter.toDisplayConnections(equipmentList);
    
    // Calculate layout
    const layoutEngine = new VerticalHierarchyLayout();
    const calculatedLayout = layoutEngine.calculateLayout(nodes, connections);
    
    setLayout(calculatedLayout);
  }, [equipmentList]);
  
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
            <EquipmentComponent 
              key={node.id} 
              node={node} 
              handleKonvaPopoverOpen={handleKonvaPopoverOpen} 
              handleEditEquipment={handleEditEquipment}
            />
          )}
        </Layer>
      </Stage>
      
      {/* Konva-specific Popover */}
      <Popover
        open={Boolean(popoverContentKonva)}
        anchorReference="anchorPosition"
        anchorPosition={popoverPositionKonva ? { top: popoverPositionKonva.y, left: popoverPositionKonva.x } : undefined}
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
        {popoverContentKonva}
      </Popover>
    </Box>
  );
}

export default Display;