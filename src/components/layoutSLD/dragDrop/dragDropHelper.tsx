import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';

interface DragDropHelperProps {
  isDragActive: boolean;
}


// TODO: this should probably use the generic MUI snackbar
const DragDropHelper: React.FC<DragDropHelperProps> = ({ isDragActive }) => {
  if (!isDragActive) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      <Alert 
        severity="info"
        sx={{
          boxShadow: 3,
          animation: 'pulse 1.5s ease-in-out infinite',
          '@keyframes pulse': {
            '0%': { opacity: 0.8 },
            '50%': { opacity: 1 },
            '100%': { opacity: 0.8 },
          },
        }}
      >
        <Typography variant="body2">
          Drop on a connection line to insert equipment
        </Typography>
      </Alert>
    </Box>
  );
};

export default DragDropHelper;
