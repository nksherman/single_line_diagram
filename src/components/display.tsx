import React from 'react';
import { Stage, Layer, Rect, Text } from 'react-konva';
import { Box } from '@mui/material';

/**
 * Define a space for displaying equipment and connections in a single line diagram.
 * This component will render a Konva stage with various shapes representing
 * electrical equipment and connections.
 * 
 * For now, display all equipment vertically.
 * 
 * 
 * 
 * 
 */

function Display() {
    return (
        <Box sx={{ width: '100%', height: '100%' }}>
        <Stage width={window.innerWidth} height={window.innerHeight}>
            <Layer>
            {/* Example equipment representation */}
            <Rect
                x={50}
                y={50}
                width={100}
                height={50}
                fill="blue"
                stroke="black"
                strokeWidth={2}
            />
            <Text
                x={60}
                y={60}
                text="Equipment 1"
                fontSize={16}
                fill="white"
            />
            {/* Add more equipment and connections as needed */}
            </Layer>
        </Stage>
        </Box>
    );
}

export default Display;