import React from 'react';
import { useReactFlow } from '@xyflow/react';
import Box from '@mui/material/Box';

interface SnapLine {
  x?: number;
  y?: number;
}

interface SnapLinesOverlayProps {
  snapLines: SnapLine[];
}

/**
 * Component that renders visual snap lines during node dragging
 * Shows red lines where nodes would snap to for alignment
 */
export const SnapLinesOverlay: React.FC<SnapLinesOverlayProps> = ({ snapLines }) => {
  const reactFlow = useReactFlow();
  
  return (
    <>
      {snapLines.map((line, index) => {
        if (line.x !== undefined) {
          // Vertical line - convert world coordinate to screen coordinate
          const viewport = reactFlow.getViewport();
          const screenX = (line.x * viewport.zoom) + viewport.x;
          return (
            <Box
              key={`vertical-${index}`}
              sx={{
                position: 'absolute',
                backgroundColor: '#ff6b6b',
                opacity: 0.8,
                pointerEvents: 'none',
                zIndex: 1000,
                left: screenX,
                top: 0,
                width: 2,
                height: '100%',
              }}
            />
          );
        } else if (line.y !== undefined) {
          // Horizontal line - convert world coordinate to screen coordinate
          const viewport = reactFlow.getViewport();
          const screenY = (line.y * viewport.zoom) + viewport.y;
          return (
            <Box
              key={`horizontal-${index}`}
              sx={{
                position: 'absolute',
                backgroundColor: '#ff6b6b',
                opacity: 0.8,
                pointerEvents: 'none',
                zIndex: 1000,  
                left: 0,
                top: screenY,
                width: '100%',
                height: 2,
              }}
            />
          );
        }
        return null;
      })}
    </>
  );
};

export default SnapLinesOverlay;
