import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import EquipmentBase from '../../../models/equipmentBase';

interface EquipmentComponentProps {
  equipment: EquipmentBase;
}

const EquipmentComponent: React.FC<EquipmentComponentProps> = ({ equipment }) => {
  return (
    <Box>
      <Typography variant="h6">{equipment.name}</Typography>
      <Box 
        sx={{ 
          width: 40, 
          height: 40, 
          border: '1px solid black', 
          borderRadius: '5px', 
          padding: '5px' 
        }}
      />
    </Box>
  );
};

export default EquipmentComponent;