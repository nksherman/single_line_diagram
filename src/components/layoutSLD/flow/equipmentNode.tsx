import React from 'react';
import { Handle, Position, type Node } from '@xyflow/react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import EquipmentBase from '../../../models/equipmentBase';
import Bus from '../../../models/busEquipment';
import { getBaseEquipmentSize, calculateEquipmentDimensions, getTextGroups } from '../../../utils/equipmentDimensions';
import { getIconPath } from '../../../utils/iconUtils';
import BusEquipmentNode from './busEquipmentNode';


export interface EquipmentNodeData extends Record<string, unknown> {
  equipment: EquipmentBase;
  onEdit: (equipment: EquipmentBase) => void;
  onResize?: (equipment: EquipmentBase, width: number, height: number) => void;
}

// Create typed versions of React Flow nodes
export type EquipmentFlowNode = Node<EquipmentNodeData, 'equipmentNode'>;
export type BusFlowNode = Node<EquipmentNodeData, 'busNode'>;
export type CustomFlowNode = EquipmentFlowNode | BusFlowNode;


// Custom node component props
export interface EquipmentNodeProps {
  data: {
    equipment: EquipmentBase;
    onEdit: (equipment: EquipmentBase) => void;
    onResize?: (equipment: EquipmentBase, width: number, height: number) => void;
  },
  selected?: boolean;
}

const EquipmentNode: React.FC<EquipmentNodeProps> = ({ data, selected }) => {
  const { equipment, onEdit } = data;

  // If this is a bus equipment, use the specialized bus component
  if (equipment instanceof Bus) {
    return <BusEquipmentNode data={{ ...data, equipment: equipment as Bus }} selected={selected} />;
  }
  
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

  const logHandles = (customHandles: any, side: any) => {
    console.log(`Equipment: ${equipment.name}, 
      HandlesCustom: ${customHandles.length > 0 ? customHandles.map(h => h.id).join(', ') : 'None'}
      else handleId: ${side}`);
  };

  const generateHandles = (sourceSide: boolean, side: 'top' | 'bottom') => {
    const pos = side === 'top' ? Position.Top : Position.Bottom;

    // Check if there are custom handles defined for this side
    const customHandles = equipment.handles.filter(h => 
      h.side === side && h.isSource === !sourceSide
    );

    // If custom handles exist, use them
    if (customHandles.length > 0) {
      return customHandles.map((handle) => (
        <Handle
          key={handle.id}
          type={sourceSide ? 'target' : 'source'}
          position={pos}
          id={handle.id}
          style={{ 
            background: getNodeColor(equipment.type),
            left: `${handle.positionPercent}%`,
          }}
        />
      ));
    }

    // Default handle if no custom handles are defined
    return (
      <Handle
        type={sourceSide ? 'target' : 'source'}
        position={pos}
        id={`${side}`}
        style={{ 
          background: getNodeColor(equipment.type),
          left: '50%',
        }}
      />
    );
  };

  const handleDoubleClick = () => {
    onEdit(equipment);
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
      { /* Generate top and bottom handles based on equipment type */}
      {generateHandles(true, 'top')} {/* Source handles on top */}
      {generateHandles(false, 'bottom')} {/* Target handles on bottom */}
      
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
        {textGroups.left && (
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
        )}

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
    </Box>
  );
};

export default EquipmentNode;