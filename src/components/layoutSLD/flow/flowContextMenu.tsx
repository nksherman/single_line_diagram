import { useCallback, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Paper, MenuList, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EquipmentBase from '../../../models/equipmentBase';

interface ContextMenuProps {
  id: string;
  top?: number | false;
  left?: number | false;
  right?: number | false;
  bottom?: number | false;
  equipmentList: EquipmentBase[];
  onEdit?: (equipment: EquipmentBase) => void;
  onDelete?: (equipment: EquipmentBase) => void;
  onClick: () => void; // This handles closing the menu when clicked
}

export default function ContextMenu({
  id,
  top,
  left,
  right,
  bottom,
  equipmentList,
  onEdit,
  onDelete,
  onClick,
}: ContextMenuProps) {
  const { setNodes, setEdges } = useReactFlow();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClick(); // Close menu
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClick]);

  // Find the equipment associated with this node
  const equipment = equipmentList.find(eq => eq.id === id);

  const handleEdit = useCallback(() => {
    if (equipment && onEdit) {
      onEdit(equipment);
    }
    onClick(); // Close menu
  }, [equipment, onEdit, onClick]);

  const handleDelete = useCallback(() => {
    if (equipment && onDelete) {
      // Call parent delete handler to remove from equipment list
      onDelete(equipment);
    } else {
      // Fallback: remove from nodes and edges directly if no parent handler
      setNodes((nodes) => nodes.filter((node) => node.id !== id));
      setEdges((edges) => edges.filter((edge) => edge.source !== id && edge.target !== id));
    }
    onClick(); // Close menu
  }, [id, equipment, onDelete, setNodes, setEdges, onClick]);

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
