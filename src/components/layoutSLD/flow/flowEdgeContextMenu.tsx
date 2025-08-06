import { useCallback, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Paper, MenuList, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

interface EdgeContextMenuProps {
  id: string;
  top?: number | false;
  left?: number | false;
  right?: number | false;
  bottom?: number | false;
  onDeleteEdge?: (edgeId: string) => void;
  onClick: () => void; // This handles closing the menu when clicked
}

export default function EdgeContextMenu({
  id,
  top,
  left,
  right,
  bottom,
  onDeleteEdge,
  onClick,
}: EdgeContextMenuProps) {
  const { setEdges } = useReactFlow();

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

  const handleDelete = useCallback(() => {
    if (onDeleteEdge) {
      onDeleteEdge(id);
    } else {
      // Fallback: remove edge directly from React Flow
      console.warn('No onDeleteEdge handler provided, removing edge directly');
    }
    onClick(); // Close menu
  }, [id, onDeleteEdge, setEdges, onClick]);

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
