import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';

import type { EquipmentType } from '../../../types/equipment.types';
import { getIconPath } from '../../../utils/iconUtils';

interface DraggableEquipmentIconProps {
  type: EquipmentType;
  label: string;
}

const DraggableEquipmentIcon: React.FC<DraggableEquipmentIconProps> = ({ type, label }) => {
  const iconPath = getIconPath(type);

  const handleDragStart = (event: React.DragEvent) => {
    // Store the equipment type in the drag data
    event.dataTransfer.setData('application/equipment-type', type);
    event.dataTransfer.effectAllowed = 'copy';
    
    // Create a custom drag image using the icon
    const dragImage = new Image();
    dragImage.src = iconPath;
    dragImage.onload = () => {
      event.dataTransfer.setDragImage(dragImage, 25, 25);
    };
  };

  const getEquipmentColor = (type: string) => {
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
      case 'meter':
        return '#795548';
      default:
        return '#757575';
    }
  };

  return (
    <Paper
      draggable
      onDragStart={handleDragStart}
      sx={{
        p: 2,
        cursor: 'grab',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        minHeight: 80,
        border: 2,
        borderColor: 'transparent',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: getEquipmentColor(type),
          boxShadow: 2,
          transform: 'translateY(-2px)',
        },
        '&:active': {
          cursor: 'grabbing',
          transform: 'translateY(0)',
        },
      }}
    >
      <Box
        component="img"
        src={iconPath}
        alt={type}
        sx={{
          width: 40,
          height: 40,
          objectFit: 'contain',
          pointerEvents: 'none',
        }}
        onError={(e) => {
          // Fallback to colored rectangle if SVG fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          if (target.parentElement) {
            const fallback = document.createElement('div');
            fallback.style.width = '40px';
            fallback.style.height = '40px';
            fallback.style.backgroundColor = getEquipmentColor(type);
            fallback.style.opacity = '0.7';
            fallback.style.borderRadius = '4px';
            target.parentElement.insertBefore(fallback, target);
          }
        }}
      />
      <Typography
        variant="caption"
        align="center"
        sx={{
          fontSize: 10,
          fontWeight: 'medium',
          color: 'text.secondary',
          lineHeight: 1.2,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {label}
      </Typography>
    </Paper>
  );
};

interface EquipmentPaletteProps {
  availableEquipment?: Array<{
    type: EquipmentType;
    label: string;
  }>;
}

const EquipmentPalette: React.FC<EquipmentPaletteProps> = ({
  availableEquipment = [
    { type: 'Generator', label: 'Generator' },
    { type: 'Transformer', label: 'Transformer' },
    { type: 'Bus', label: 'Bus' },
    { type: 'Meter', label: 'Meter' },
    { type: 'Switchgear', label: 'Switchgear' },
    { type: 'Breaker', label: 'Breaker' },
  ]
}) => {
  return (
    <Box>
      <Typography
        variant="h6"
        sx={{
          mb: 2,
          fontWeight: 'medium',
          color: 'text.primary',
        }}
      >
        Equipment Palette
      </Typography>
      <Typography
        variant="body2"
        sx={{
          mb: 2,
          color: 'text.secondary',
          fontSize: '0.875rem',
        }}
      >
        Drag equipment onto connections to create new equipment
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 1,
        }}
      >
        {availableEquipment.map((equipment) => (
          <DraggableEquipmentIcon
            key={equipment.type}
            type={equipment.type}
            label={equipment.label}
          />
        ))}
      </Box>
    </Box>
  );
};

export default EquipmentPalette;
