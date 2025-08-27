import React from 'react';
import Box from '@mui/material/Box';

interface DebugOverlayProps {
  mousePosition: { x: number; y: number } | null;
  isDragActive: boolean;
  closestEdgeId: string | null;
}

const DebugOverlay: React.FC<DebugOverlayProps> = ({
  mousePosition,
  isDragActive,
  closestEdgeId,
}) => {
  if (!mousePosition) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: 1,
        borderRadius: 1,
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 1000,
        pointerEvents: 'none',
        minWidth: '120px',
      }}
    >
      <div>Flow X: {Math.round(mousePosition.x)}</div>
      <div>Flow Y: {Math.round(mousePosition.y)}</div>
      {isDragActive && (
        <>
          <div style={{ color: '#ffa726', marginTop: '4px' }}>
            🎯 DRAGGING
          </div>
          {closestEdgeId && (
            <div style={{ color: '#ff6b35', marginTop: '2px', fontSize: '10px' }}>
              Target: {closestEdgeId}
            </div>
          )}
        </>
      )}
    </Box>
  );
};

export default DebugOverlay;
