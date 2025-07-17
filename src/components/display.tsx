import { useState, useEffect }  from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { Box } from '@mui/material';

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

function Display({ equipment }: { equipment: EquipmentBase[] }) {
  const [layout, setLayout] = useState<{ nodes: DisplayNode[], connections: DisplayConnection[] }>();
  
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
    <Box sx={{ width: '100%', height: '100%' }}>
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          {/* Render connections first (behind equipment) */}
          {layout.connections.map(conn => 
            <Line key={conn.id} points={conn.points} stroke="black" />
          )}
          
          {/* Render equipment nodes */}
          {layout.nodes.map(node => 
            <EquipmentComponent key={node.id} node={node} />
          )}
        </Layer>
      </Stage>
    </Box>
  );
}

export default Display;