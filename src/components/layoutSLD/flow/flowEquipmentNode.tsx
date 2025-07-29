import React from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import EquipmentBase from '../../../models/equipmentBase';
import Bus from '../../../models/busEquipment';
import { getBaseEquipmentSize, calculateEquipmentDimensions, getTextGroups } from '../../../utils/equipmentDimensions';

// Custom node component props
interface ReactFlowEquipmentNodeProps {
  data: {
    equipment: EquipmentBase;
    onEdit: (equipment: EquipmentBase) => void;
    onResize?: (equipment: EquipmentBase, width: number, height: number) => void;
  };
}

const ReactFlowEquipmentNode: React.FC<ReactFlowEquipmentNodeProps> = ({ data }) => {
  const { equipment, onEdit, onResize } = data;
  
  const handleDoubleClick = () => {
    onEdit(equipment);
  };

  const handleResize = (_event: any, params: { width: number; height: number }) => {
    if (equipment instanceof Bus && onResize) {
      // Only allow horizontal resizing for Bus equipment
      const bus = equipment as Bus;
      bus.width = params.width;
      onResize(equipment, params.width, params.height);
    }
  };

  const isBus = equipment instanceof Bus;

  // Get SVG icon path
  const getIconPath = (type: string): string => {
    return `/icons/${type.toLowerCase()}.svg`;
  };

  // Use the shared dimension calculation
  const equipmentDimensions = calculateEquipmentDimensions(equipment);
  const equipmentSize = getBaseEquipmentSize(equipment.type);
  const iconPath = getIconPath(equipment.type);
  const nodeWidth = equipmentDimensions.width;
  const textGroups = getTextGroups(equipment);

  const getNodeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'generator':
        return '#4CAF50';
      case 'transformer':
        return '#FF9800';
      case 'switchgear':
        return '#2196F3';
      case 'bus':
        return '#9C27B0';
      case 'breaker':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  // Generate handles for bus equipment
  const generateBusHandles = (equipment: EquipmentBase, sourceSide: boolean, side: 'left' | 'right' | 'top' | 'bottom') => {
    if (!(equipment instanceof Bus)) return null;
    const bus = equipment as Bus;

    const pos = side === 'top' ? Position.Top : side === 'bottom' ? Position.Bottom : side === 'left' ? Position.Left : Position.Right;

    let handlesCount = 0;
    if (sourceSide) {
      handlesCount = bus.sources?.size || 1;
    } else {
      handlesCount = bus.loads?.size || 1;
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
            background: getNodeColor(equipment.type),
            left: side === 'top' || side === 'bottom' ? `${((i + 1) / (handlesCount + 1)) * 100}%` : undefined,
            top: side === 'left' || side === 'right' ? `${((i + 1) / (handlesCount + 1)) * 100}%` : undefined,
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
        borderColor: getNodeColor(equipment.type),
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
      {/* NodeResizer for Bus equipment - only allow horizontal resizing */}
      {isBus && (
        <NodeResizer
          onResize={handleResize}
          isVisible={true}
          minWidth={20}
          minHeight={equipmentSize.height}
          maxHeight={equipmentSize.height}
          handleStyle={{
            backgroundColor: getNodeColor(equipment.type),
            border: `1px solid ${getNodeColor(equipment.type)}`,
          }}
          lineStyle={{
            borderColor: getNodeColor(equipment.type),
          }}
          keepAspectRatio={false}
          shouldResize={(_event, params) => {
            // Only allow horizontal resizing
            return params.direction[0] !== 0 && params.direction[1] === 0;
          }}
        />
      )}
      
      {/* Top handle for connections from sources */}
      {equipment instanceof Bus ? (
        <>
          {generateBusHandles(equipment, true, 'top')}
        </>
      ) : (
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          style={{ background: getNodeColor(equipment.type) }}
        />
      )}
      
      {/* Top text */}
      <Box>
        {/* Top left Text */}
        {textGroups.topLeft && (
        <Typography
          variant="body2"
          sx={{
            position: 'absolute',
            top: -20,
            // left: '50%',
            // transform: 'translateX(-50%)',
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
            // left: '50%',
            // transform: 'translateX(-50%)',
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
      

      {/* Main content container */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 1,
        }}
      >
        {/* Left gutter */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: 0.5,
            minWidth: 'fit-content',
          }}
        >
          {textGroups.left.map((text, index) => (
            <Typography
              key={`left-${index}`}
              variant="body2"
              sx={{
                fontSize: 10,
                color: index === 0 ? 'blue' : 'green',
                whiteSpace: 'nowrap',
                lineHeight: 1,
              }}
            >
              {text}
            </Typography>
          ))}
        </Box>

        {/* Center - SVG Icon */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Box
            component="img"
            src={iconPath}
            alt={equipment.type}
            sx={{
              width: equipmentSize.width,
              height: equipmentSize.height,
              objectFit: 'contain',
            }}
            onError={(e) => {
              // Fallback to colored rectangle if SVG fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.style.backgroundColor = getNodeColor(equipment.type);
              target.parentElement!.style.opacity = '0.3';
            }}
          />
        </Box>

        {/* Right gutter */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            gap: 0.5,
            minWidth: 'fit-content',
          }}
        >
          {textGroups.right.map((text, index) => {
            let color = 'black';
            return (
              <Typography
                key={`right-${index}`}
                variant="body2"
                sx={{
                  fontSize: 10,
                  color,
                  whiteSpace: 'nowrap',
                  lineHeight: 1,
                }}
              >
                {text}
              </Typography>
            );
          })}
        </Box>
      </Box>

      {/* Bottom text */}
      <Box>
        {/* Bottom left Text */}
        {textGroups.bottomLeft && (
        <Typography
          variant="body2"
          sx={{
            position: 'absolute',
            top: -20,
            // left: '50%',
            // transform: 'translateX(-50%)',
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
            // left: '50%',
            // transform: 'translateX(-50%)',
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
      {/* Bottom handle for connections to loads */}
      {equipment instanceof Bus ? (
        <>
          {generateBusHandles(equipment, false, 'bottom')}
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          style={{ background: getNodeColor(equipment.type) }}
        />
      )}
    </Box>
  );
};

export default ReactFlowEquipmentNode;