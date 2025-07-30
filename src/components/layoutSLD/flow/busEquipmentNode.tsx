import React from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import EquipmentBase from '../../../models/equipmentBase';
import Bus from '../../../models/busEquipment';
import { getBaseEquipmentSize, calculateEquipmentDimensions, getTextGroups } from '../../../utils/equipmentDimensions';

// Bus equipment node component props
interface BusEquipmentNodeProps {
  data: {
    equipment: Bus;
    onEdit: (equipment: EquipmentBase) => void;
    onResize?: (equipment: EquipmentBase, width: number, height: number) => void;
  };
  selected?: boolean;
}

const BusEquipmentNode: React.FC<BusEquipmentNodeProps> = ({ data, selected }) => {
  const { equipment, onEdit, onResize } = data;
  
  const handleDoubleClick = () => {
    onEdit(equipment);
  };

  const handleResize = (_event: any, params: { width: number; height: number }) => {
    if (onResize) {
      // Only allow horizontal resizing for Bus equipment
      equipment.width = params.width;
      onResize(equipment, params.width, params.height);
    }
  };

  // Use the shared dimension calculation
  const equipmentDimensions = calculateEquipmentDimensions(equipment);
  const equipmentSize = getBaseEquipmentSize(equipment.type);
  const nodeWidth = equipmentDimensions.width;
  const textGroups = getTextGroups(equipment);

  const getBusColor = () => '#9C27B0'; // Purple color for bus

  // Generate handles for bus equipment
  const generateBusHandles = (sourceSide: boolean, side: 'top' | 'bottom') => {
    const pos = side === 'top' ? Position.Top : Position.Bottom;

    let handlesCount = 0;
    if (sourceSide) {
      handlesCount = equipment.sources?.size || 1;
    } else {
      handlesCount = equipment.loads?.size || 1;
    }
    
    const handles = [];
    for (let i = 0; i < handlesCount; i++) {
      handles.push(
        <Handle
          key={`${side}-${i}`}
          type={sourceSide ? 'target' : 'source'}
          position={pos}
          id={`${side}-${i}`}
          style={{ 
            background: getBusColor(),
            left: `${((i + 1) / (handlesCount + 1)) * 100}%`,
          }}
        />
      );
    }
    
    return handles;
  };

  return (
    <Box
      sx={{
        position: 'relative',
        paddingx: 1,
        border: '2px solid',
        borderColor: getBusColor(),
        borderRadius: 1,
        backgroundColor: 'white',
        width: nodeWidth,
        minHeight: equipmentSize.height,
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: '#f5f5f5',
          boxShadow: 2,
        },
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* NodeResizer - only allow horizontal resizing */}
      <NodeResizer
        onResize={handleResize}
        isVisible={selected}
        minWidth={20}
        minHeight={equipmentSize.height}
        maxHeight={equipmentSize.height}
        handleStyle={{
          backgroundColor: getBusColor(),
          border: `1px solid ${getBusColor()}`,
        }}
        lineStyle={{
          borderColor: getBusColor(),
        }}
        keepAspectRatio={false}
        shouldResize={(_event, params) => {
          // Only allow horizontal resizing
          return params.direction[0] !== 0 && params.direction[1] === 0;
        }}
      />
      
      {/* Top handles for connections from sources */}
      {generateBusHandles(true, 'top')}
      
      {/* Top text - only text area for bus equipment */}
      <Box>
        {/* Top left Text */}
        {textGroups.topLeft && (
          <Typography
            variant="body2"
            sx={{
              position: 'absolute',
              top: -20,
              left: 0,
              transform: 'translateX(0)',
              fontSize: 12,
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            {textGroups.topLeft}
          </Typography>
        )}
        {textGroups.topRight && (
          <Typography
            variant="body2"
            sx={{
              position: 'absolute',
              top: -20,
              right: 0,
              transform: 'translateX(0)',
              fontSize: 12,
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            {textGroups.topRight}
          </Typography>
        )}
      </Box>

      {/* Main content container - simplified for bus (no SVG, no gutters) */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          backgroundColor: getBusColor(),
          opacity: 0.3,
          borderRadius: '2px',
        }}
      >
        {/* Bus equipment has no SVG icon, just colored rectangle */}
      </Box>

      {/* Bottom text */}
      <Box>
        {/* Bottom left Text */}
        {textGroups.bottomLeft && (
          <Typography
            variant="body2"
            sx={{
              position: 'absolute',
              bottom: -20,
              left: 0,
              transform: 'translateX(0)',
              fontSize: 12,
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            {textGroups.bottomLeft}
          </Typography>
        )}
        {textGroups.bottomRight && (
          <Typography
            variant="body2"
            sx={{
              position: 'absolute',
              bottom: -20,
              right: 0,
              transform: 'translateX(0)',
              fontSize: 12,
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            {textGroups.bottomRight}
          </Typography>
        )}
      </Box>

      {/* Bottom handles for connections to loads */}
      {generateBusHandles(false, 'bottom')}
    </Box>
  );
};

export default BusEquipmentNode;
