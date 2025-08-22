import React from 'react';
import { Handle, Position, type Node } from '@xyflow/react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import EquipmentBase from '../../../models/equipmentBase';
import Bus from '../../../models/busEquipment';
import { getBaseEquipmentSize, calculateEquipmentDimensions, getTextGroups } from '../../../utils/equipmentDimensions';
import { getIconPath } from '../../../utils/iconUtils';
import BusEquipmentNode from './busEquipmentNode';

import { type HandlePosition } from '../../../types/equipment.types';

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

const EquipmentNode: React.FC<EquipmentNodeProps> = ({ data }) => {
  const { equipment, onEdit } = data;

  // If this is a bus equipment, use the specialized bus component
  if (equipment instanceof Bus) {
    return <BusEquipmentNode data={{ ...data, equipment: equipment as Bus }} />;
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


  const generateHandlesFinal = () => {
    const handleObj = equipment.handles.reduce((acc: Record<string, any>, handle: HandlePosition) => {
      const side = handle.side;
      if (!acc[side]) {
        acc[side] = [];
      }
      acc[side].push(handle);
      return acc;
    }, {});

    // Flatten the handles from all sides into a single array
    const theseHandles: React.ReactElement[] = Object.entries(handleObj).flatMap(([side, handles]) => {
      return handles.map((handle: any) => {
        // Determine the correct positioning style based on handle side
        const positionStyle: React.CSSProperties = {
          background: getNodeColor(equipment.type),
        };
        
        // For top/bottom handles, use left positioning
        // For left/right handles, use top positioning
        if (side === Position.Top || side === Position.Bottom) {
          positionStyle.left = `${handle.positionPercent}%`;
        } else if (side === Position.Left || side === Position.Right) {
          positionStyle.top = `${handle.positionPercent}%`;
        } else {
          // Fallback for any other position
          positionStyle.left = `${handle.positionPercent}%`;
        }
        
        return (
          <Handle
            key={handle.id}
            type={handle.isSource ? 'source' : 'target'}
            position={side as Position}
            id={handle.id}
            style={positionStyle}
          />
        );
      });
    });

  // Check if we have any source handles
  const hasSourceHandle = theseHandles.some((handle: any) => handle.props.type === 'source');
  // Add at least one type=source handle in the middle if none exists
  if (!hasSourceHandle) {
    theseHandles.push(
      <Handle
        key={`source-default`}
        type="source"
        position={Position.Bottom}
        id={`source-default`}
        style={{
          background: getNodeColor(equipment.type),
          left: '50%',
        }}
      />
    );
  }
  
  // Check if we have any target handles
  const hasTargetHandle = theseHandles.some((handle: any) => handle.props.type === 'target');
  if (!hasTargetHandle) {
    theseHandles.push(
      <Handle
        key={`target-default`}
        type="target"
        position={Position.Top}
        id={`target-default`}
        style={{
          background: getNodeColor(equipment.type),
          left: '50%',
        }}
      />
    );
  }

  return theseHandles;
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
      {generateHandlesFinal()}
      
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