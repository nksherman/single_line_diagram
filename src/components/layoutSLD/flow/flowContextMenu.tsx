import { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useReactFlow } from '@xyflow/react';
import { Paper, MenuList, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EquipmentBase from '../../../models/equipmentBase';

interface ContextMenuProps {
  id: string;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  equipmentList: EquipmentBase[];
  onEdit?: (equipment: EquipmentBase) => void;
  onDelete?: (equipment: EquipmentBase) => void;
  onClose: () => void;
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
  onClose,
}: ContextMenuProps) {
  const { setNodes, setEdges } = useReactFlow();

  // Find the equipment associated with this node
  const equipment = equipmentList.find(eq => eq.id === id);

  // Add click-away listener
  useEffect(() => {
    const handleClickAway = (event: MouseEvent) => {
      // Check if the click is outside the menu
      const target = event.target as Element;
      if (target && !target.closest('[data-context-menu]')) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickAway);
    return () => {
      document.removeEventListener('mousedown', handleClickAway);
    };
  }, [onClose]);

  const handleEdit = useCallback(() => {
    if (equipment && onEdit) {
      onEdit(equipment);
    }
    onClose();
  }, [equipment, onEdit, onClose]);

  const handleDelete = useCallback(() => {
    if (equipment && onDelete) {
      // Call parent delete handler to remove from equipment list
      onDelete(equipment);
    } else {
      // Fallback: remove from nodes and edges directly if no parent handler
      setNodes((nodes) => nodes.filter((node) => node.id !== id));
      setEdges((edges) => edges.filter((edge) => edge.source !== id && edge.target !== id));
    }
    onClose();
  }, [id, equipment, onDelete, setNodes, setEdges, onClose]);

  return createPortal(
    <Paper
      data-context-menu
      sx={{
        position: 'fixed',
        top,
        left,
        right,
        bottom,
        zIndex: 2000,
        minWidth: 150,
        boxShadow: 3,
      }}
      elevation={8}
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
    </Paper>,
    document.body
  );
}
