import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import Generator from '../../../models/generatorEquipment';

interface GeneratorComponentProps {
  equipment: Generator;
}

const GeneratorComponent: React.FC<GeneratorComponentProps> = ({ equipment }) => {

  const svgPath = `/icons/${equipment.type.toLowerCase()}.svg`;

  return (
    <Box>
      <Typography variant="h6">{equipment.name}</Typography>
      <Box 
        component="img"
        src={svgPath}
        alt={equipment.type}
        sx={{
          width: 40,
          height: 40,
          objectFit: 'contain',
        }}
      />
    </Box>
  );
};

export default GeneratorComponent;