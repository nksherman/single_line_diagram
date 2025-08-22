import { useCallback, useEffect } from 'react';
import { useReactFlow, useStore } from '@xyflow/react';
import { Paper, MenuList, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';

import { type CustomFlowNode } from './equipmentNode';

import EquipmentBase from '../../../models/equipmentBase';
import Bus from '../../../models/busEquipment';

interface ContextMenuProps {
  id: string;
  top?: number | false;
  left?: number | false;
  right?: number | false;
  bottom?: number | false;
  node?: CustomFlowNode;
  onEdit?: (equipment: EquipmentBase) => void;
  onDelete?: (equipment: EquipmentBase) => void;
  onClose: () => void; // This handles closing the menu when clicked
  triggerRerender?: () => void; // Optional callback to trigger a re-render
  onToggleResizeMode?: (equipmentId: string) => void; // New prop for toggling resize mode
}

export default function NodeContextMenu({
  id,
  top,
  left,
  right,
  bottom,
  node,
  onEdit,
  onDelete,
  onClose,
  onToggleResizeMode,
}: ContextMenuProps) {
  const { setNodes, setEdges } = useReactFlow();
  
  // Access the React Flow store to get node data
  const nodes = useStore((state) => state.nodes);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose(); // Close menu
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const equipment: EquipmentBase | null = node?.data?.equipment || null;

  const handleEdit = useCallback(() => {
    if (equipment && onEdit) {
      onEdit(equipment);
    }
    onClose(); // Close menu
  }, [equipment, onEdit, onClose]);

  const handleLogHandles = useCallback(() => {
    if (!node) {
      console.log('No node available for handle logging');
      return;
    }

    // log the equipmentdata handle list
    console.log('=== Equipment Data Handles ===');
    equipment?.handles.forEach((handle) => {
      console.log(`Handle ID: ${handle.id}, side: ${handle.side}, equip?: ${handle.connectedEquipmentId ? handle.connectedEquipmentId : 'None'}`);
    });

    // Get handle elements from the DOM - this is the most reliable way
    const nodeElement = document.querySelector(`[data-id="${node.id}"]`);
    if (nodeElement) {
      const handleElements = nodeElement.querySelectorAll('.react-flow__handle');
      console.log(`Found ${handleElements.length} handle elements in DOM`);
      
      const nodeRect = nodeElement.getBoundingClientRect();
      console.log('Node DOM rect:', {
        x: nodeRect.x,
        y: nodeRect.y,
        width: nodeRect.width,
        height: nodeRect.height
      });
      
      handleElements.forEach((handleEl, index) => {
        const rect = handleEl.getBoundingClientRect();
        const relativeX = rect.left - nodeRect.left;
        const relativeY = rect.top - nodeRect.top;
        
        console.log(`DOM Handle ${index}:`, {
          id: handleEl.getAttribute('data-handleid'),
          position: handleEl.getAttribute('data-handlepos'),
          type: handleEl.classList.contains('source') ? 'source' : 'target',
          relativePosition: { 
            x: Math.round(relativeX), 
            y: Math.round(relativeY) 
          },
          centerRelativePosition: {
            x: Math.round(relativeX + rect.width / 2),
            y: Math.round(relativeY + rect.height / 2)
          },
          absolutePosition: { 
            x: Math.round(rect.left), 
            y: Math.round(rect.top) 
          },
          size: { 
            width: Math.round(rect.width), 
            height: Math.round(rect.height) 
          },
          classList: Array.from(handleEl.classList),
        });
      });
    } else {
      console.log('Node element not found in DOM');
    }
    
    console.log('=== End Handle Positions ===');
  }, [node, nodes]);

  const handleToggleResizeMode = useCallback(() => {
    if (onToggleResizeMode && equipment) {
      onToggleResizeMode(equipment.id);
    }
    onClose(); // Close menu
  }, [onToggleResizeMode, equipment, onClose]);

  const handleDelete = useCallback(() => {
    if (equipment && onDelete) {
      // Call parent delete handler to remove from equipment list
      onDelete(equipment);
    } else {
      // Fallback: remove from nodes and edges directly if no parent handler
      setNodes((nodes) => nodes.filter((node) => node.id !== id));
      setEdges((edges) => edges.filter((edge) => edge.source !== id && edge.target !== id));
    }
    onClose(); // Close menu
  }, [id, equipment, onDelete, setNodes, setEdges, onClose]);

  return (
    <Paper
      sx={{
        position: 'absolute',
        top: top || undefined,
        left: left || undefined,
        right: right || undefined,
        bottom: bottom || undefined,
        zIndex: 1000,
        minWidth: 150,
        boxShadow: 3,
      }}
      elevation={8}
      onClick={(e: React.MouseEvent) => e.stopPropagation()} // Prevent closing when clicking inside menu
    >
      <MenuList dense>
        <MenuItem onClick={handleEdit} disabled={!onEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Edit" />
        </MenuItem>
        <Divider />
        {equipment instanceof Bus && (
            <MenuItem onClick={handleToggleResizeMode} disabled={!onToggleResizeMode}>
              <ListItemIcon>
                <AspectRatioIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={node?.data?.isResizeMode ? "Exit Resize Mode" : "Enter Resize Mode"} />
            </MenuItem>
        )}
        {equipment instanceof Bus && (<Divider /> )}
        <MenuItem onClick={handleLogHandles}>
          <ListItemIcon>
            <InfoIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Log Handles" />
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText primary="Delete" />
        </MenuItem>
      </MenuList>
    </Paper>
  );
}
