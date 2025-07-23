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

interface TextElement {
  id: string;
  text: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'left-top' | 'left-bottom' | 'right-top' | 'right-bottom';
  align: 'left' | 'center' | 'right';
  fontSize?: number;
  color?: string;
  offset?: { x: number; y: number };
}

const ReactFlowEquipmentNode: React.FC<ReactFlowEquipmentNodeProps> = ({ data }) => {
  const { equipment, onEdit } = data;
  
  const handleDoubleClick = () => {
    onEdit(equipment);
  };

  // Get equipment size based on type
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

  // Generate text elements based on equipment type and properties
  const getTextElements = (equipment: EquipmentBase): TextElement[] => {
    const textElements: TextElement[] = [];

    // Equipment name (common to all)
    textElements.push({
      id: `${equipment.id}-name`,
      text: equipment.name,
      position: 'top-right',
      align: 'left',
      fontSize: 12
    });

    // Type-specific text elements
    if (equipment instanceof Generator) {
      const gen = equipment as Generator;
      textElements.push(
        {
          id: `${gen.id}-capacity`,
          text: `${gen.capacity}MW`,
          position: 'left-top',
          align: 'right',
          fontSize: 10,
          color: 'blue'
        },
        {
          id: `${gen.id}-voltage`,
          text: `${gen.voltage}kV`,
          position: 'left-bottom',
          align: 'right',
          fontSize: 10,
          color: 'green'
        },
        {
          id: `${gen.id}-status`,
          text: gen.isOnline ? 'ON' : 'OFF',
          position: 'right',
          align: 'left',
          fontSize: 10,
          color: gen.isOnline ? 'green' : 'red',
          offset: { x: 5, y: 0 }
        }
      );
    } else if (equipment instanceof Transformer) {
      const trans = equipment as Transformer;
      textElements.push(
        {
          id: `${trans.id}-primary-voltage`,
          text: `${trans.primaryVoltage}kV`,
          position: 'left-top',
          align: 'right',
          fontSize: 10,
          color: 'blue'
        },
        {
          id: `${trans.id}-secondary-voltage`,
          text: `${trans.secondaryVoltage}kV`,
          position: 'left-bottom',
          align: 'right',
          fontSize: 10,
          color: 'green'
        },
        {
          id: `${trans.id}-power-rating`,
          text: `${trans.powerRating}MVA`,
          position: 'right-top',
          align: 'left',
          fontSize: 10,
          color: 'purple'
        },
        {
          id: `${trans.id}-phase-count`,
          text: `${trans.phaseCount} Phases`,
          position: 'right',
          align: 'left',
          fontSize: 10,
          offset: { x: 5, y: 0 }
        },
        {
          id: `${trans.id}-connection-type`,
          text: trans.connectionType,
          position: 'right-bottom',
          align: 'left',
          fontSize: 10,
          color: 'orange'
        }
      );
    } else if (equipment instanceof Bus) {
      const bus = equipment as Bus;
      textElements.push({
        id: `${bus.id}-voltage`,
        text: `${bus.voltage}kV`,
        position: 'top-left',
        align: 'center',
        fontSize: 10,
        color: 'blue'
      });
    } else if (equipment instanceof Meter) {
      const meter = equipment as Meter;
      textElements.push(
        {
          id: `${meter.id}-voltage`,
          text: `${meter.voltageRating}kV`,
          position: 'top-left',
          align: 'right',
          fontSize: 10,
          color: 'blue'
        },
        {
          id: `${meter.id}-current`,
          text: `${meter.currentRating}A`,
          position: 'right',
          align: 'left',
          fontSize: 10,
          color: 'green'
        },
        {
          id: `${meter.id}-accuracy`,
          text: `Class ${meter.accuracyClass}`,
          position: 'right-bottom',
          align: 'left',
          fontSize: 10,
          color: 'orange'
        },
        {
          id: `${meter.id}-status`,
          text: meter.isOperational ? 'Operational' : 'Not Operational',
          position: 'bottom-left',
          align: 'right',
          fontSize: 10,
          color: meter.isOperational ? 'green' : 'red'
        }
      );
    }

    return textElements;
  };

  const equipmentSize = getEquipmentSize(equipment.type);
  const iconPath = getIconPath(equipment.type);
  const textElements = getTextElements(equipment);

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

  // Convert Konva text positioning to CSS positioning
  const getTextStyle = (textElement: TextElement, nodeWidth: number, _nodeHeight: number): React.CSSProperties => {
    const { position, align, fontSize = 12, color = 'black', offset = { x: 0, y: 0 } } = textElement;
    
    let style: React.CSSProperties = {
      position: 'absolute',
      fontSize: `${fontSize}px`,
      color,
      whiteSpace: 'nowrap',
      lineHeight: '1',
      pointerEvents: 'none',
      zIndex: 10,
    };

    // Position the text relative to the node
    switch (position) {
      case 'top':
        style.top = '-20px';
        style.left = '50%';
        style.transform = 'translateX(-50%)';
        break;
      case 'bottom':
        style.bottom = '-20px';
        style.left = '50%';
        style.transform = 'translateX(-50%)';
        break;
      case 'left':
        style.top = '50%';
        style.right = `${nodeWidth + 10}px`;
        style.transform = 'translateY(-50%)';
        break;
      case 'right':
        style.top = '50%';
        style.left = `${nodeWidth + 10}px`;
        style.transform = 'translateY(-50%)';
        break;
      case 'top-left':
        style.top = '-20px';
        style.left = '0px';
        break;
      case 'top-right':
        style.top = '-20px';
        style.right = '0px';
        break;
      case 'bottom-left':
        style.bottom = '-20px';
        style.left = '0px';
        break;
      case 'bottom-right':
        style.bottom = '-20px';
        style.right = '0px';
        break;
      case 'left-top':
        style.top = '0px';
        style.right = `${nodeWidth + 10}px`;
        break;
      case 'left-bottom':
        style.bottom = '0px';
        style.right = `${nodeWidth + 10}px`;
        break;
      case 'right-top':
        style.top = '0px';
        style.left = `${nodeWidth + 10}px`;
        break;
      case 'right-bottom':
        style.bottom = '0px';
        style.left = `${nodeWidth + 10}px`;
        break;
      default:
        style.top = '50%';
        style.left = '50%';
        style.transform = 'translate(-50%, -50%)';
        break;
    }

    // Apply text alignment
    if (align === 'center') {
      if (!style.transform) style.transform = '';
      if (position === 'top' || position === 'bottom') {
        // Already centered for top/bottom
      } else {
        style.transform += ' translateX(-50%)';
      }
    } else if (align === 'right') {
      style.textAlign = 'right';
    }

    // Apply offset
    if (offset.x !== 0 || offset.y !== 0) {
      const currentTransform = style.transform || '';
      style.transform = `${currentTransform} translate(${offset.x}px, ${offset.y}px)`;
    }

    return style;
  };

  return (
    <Box
      sx={{
        position: 'relative',
        padding: 1,
        border: '2px solid',
        borderColor: getNodeColor(equipment.type),
        borderRadius: 1,
        backgroundColor: 'white',
        width: equipmentSize.width + 16, // Add padding
        height: equipmentSize.height + 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: '#f5f5f5',
          boxShadow: 2,
        },
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Top handle for connections from sources */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ background: getNodeColor(equipment.type) }}
      />
      
      {/* SVG Icon */}
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
      
      {/* Render all text elements */}
      {textElements.map(textElement => (
        <Typography
          key={textElement.id}
          variant="body2"
          sx={getTextStyle(textElement, equipmentSize.width + 16, equipmentSize.height + 16)}
        >
          {textElement.text}
        </Typography>
      ))}
      
      {/* Bottom handle for connections to loads */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: getNodeColor(equipment.type) }}
      />
    </Box>
  );
};

export default ReactFlowEquipmentNode;
