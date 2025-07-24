import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Box, Typography } from '@mui/material';
import EquipmentBase from '../../../models/equipmentBase';
import Generator from '../../../models/generatorEquipment';
import Transformer from '../../../models/transformerEquipment';
import Bus from '../../../models/busEquipment';
import Meter from '../../../models/meterEquipment';

// Custom node component props
interface ReactFlowEquipmentNodeProps {
  data: {
    equipment: EquipmentBase;
    onEdit: (equipment: EquipmentBase) => void;
  };
}

interface TextGroup {
  left: string[];
  right: string[];
  topLeft?: string; // Optional for top-left text
  topRight?: string; // Optional for top-right text
  bottomLeft?: string; // Optional for bottom-left text
  bottomRight?: string; // Optional for bottom-right text
}

const ReactFlowEquipmentNode: React.FC<ReactFlowEquipmentNodeProps> = ({ data }) => {
  const { equipment, onEdit } = data;
  
  const handleDoubleClick = () => {
    onEdit(equipment);
  };

  // Get equipment icon size based on type
  const getEquipmentSize = (type: string): { width: number; height: number } => {
    const sizes: Record<string, { width: number; height: number }> = {
      Generator: { width: 40, height: 40 },
      Transformer: { width: 60, height: 40 },
      Bus: { width: 60, height: 4 },
      Meter: { width: 30, height: 30 },
      Switchgear: { width: 40, height: 40 },
      Breaker: { width: 30, height: 30 },
      Load: { width: 30, height: 30 },
    };
    return sizes[type] || { width: 40, height: 40 };
  };

  // Get SVG icon path
  const getIconPath = (type: string): string => {
    return `/icons/${type.toLowerCase()}.svg`;
  };

  // Generate text groups based on equipment type and properties
  const getTextGroups = (equipment: EquipmentBase): TextGroup => {
    const textGroup: TextGroup = {
      left: [],
      right: [],
      topLeft: equipment.name
    };

    // Type-specific text elements
    if (equipment instanceof Generator) {
      const gen = equipment as Generator;
      textGroup.right = [
        `${gen.capacity}MW`,
      ];
      textGroup.bottomRight = `${gen.voltage}kV`;

    } else if (equipment instanceof Transformer) {
      const trans = equipment as Transformer;
      textGroup.left = [
        `${trans.powerRating}MVA`
      ];
      textGroup.right = [
        `${trans.primaryVoltage}kV`,
        `${trans.secondaryVoltage}kV`
      ];
    } else if (equipment instanceof Bus) {
      const bus = equipment as Bus;
      textGroup.topRight = `${bus.voltage}kV`;
    } else if (equipment instanceof Meter) {
      const meter = equipment as Meter;
      textGroup.right = [
        `${meter.currentRating}A`,
        `${meter.voltageRating}kV`,
      ];
    }

    return textGroup;
  };

  // Calculate dynamic width based on text content
  const calculateWidth = (textGroups: TextGroup, iconWidth: number): number => {
    const baseIconWidth = iconWidth;
    
    // Estimate text width (rough approximation)
    const estimateTextWidth = (texts: string[]): number => {
      if (texts.length === 0) return 0;
      const maxLength = Math.max(...texts.map(text => text.length));
      return Math.max(maxLength * 10); // Rough character width estimation
    };

    
    const leftWidth = estimateTextWidth(textGroups.left);
    const rightWidth = estimateTextWidth(textGroups.right);
    const topBottomWidth = Math.max(
      estimateTextWidth(textGroups.topLeft ? [textGroups.topLeft] : []) +  estimateTextWidth(textGroups.topRight ? [textGroups.topRight] : []),
      estimateTextWidth(textGroups.bottomLeft ? [textGroups.bottomLeft] : []) + estimateTextWidth(textGroups.bottomRight ? [textGroups.bottomRight] : [])
    );

    return Math.max(
      baseIconWidth + leftWidth + rightWidth,
      topBottomWidth,
      40 // Minimum width
    );
  };

  const equipmentSize = getEquipmentSize(equipment.type);
  const iconPath = getIconPath(equipment.type);
  const textGroups = getTextGroups(equipment);
  const nodeWidth = calculateWidth(textGroups, equipmentSize.width);

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