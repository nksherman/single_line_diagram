import { useState } from 'react'
import type { ReactNode } from 'react'
import './App.css'

import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Popover from '@mui/material/Popover'

import Display from './components/display'
import EquipmentCreator from './components/equipmentCreator'

import { EquipmentBase } from './models/equipmentBase'
import { Generator } from './models/generatorEquipment'


function defaultEquipment(): EquipmentBase[] {
  EquipmentBase.clearRegistry();

  const generator1 = new Generator('1', 'Generator 1', {
    capacity: 100,
    voltage: 11,
    fuelType: 'natural_gas',
    efficiency: 95,
    isOnline: true
  });

  const generator2 = new Generator('2', 'Generator 2', {
    capacity: 150,
    voltage: 11,
    fuelType: 'diesel',
    efficiency: 90,
    isOnline: false
  });

  // Connect generators
  EquipmentBase.connectById(generator1.id, generator2.id);
  return [generator1, generator2];
}


function App() {
  const [equipment, setEquipment] = useState<EquipmentBase[]>(() => defaultEquipment());

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [popoverContent, setPopoverContent] = useState<ReactNode | null>(null);


  /* handle popout info and formula */  
  const handlePopoverOpen = (anchorElement: HTMLElement, content: ReactNode) => {
    setAnchorEl(anchorElement);
    setPopoverContent(content);
  };
  
  const handlePopoverClose = () => {
    setAnchorEl(null);
    setPopoverContent(null);
  };

  return (
    <Paper>
      <Box sx={{ p: 2 }}>
        <Typography variant="h2" gutterBottom>Single Line Diagram</Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Equipment Creator */}
          <Box sx={{ flex: '0 0 400px' }}>
            <EquipmentCreator 
              equipmentList={equipment} 
              setEquipmentList={setEquipment}
            />
            <Button
              onClick={() => console.log('Save equipment:', equipment)}
            >
              Save
            </Button>
          </Box>
          
          {/* Display */}
          <Box sx={{ flex: 1 }}>
            <Display equipment={equipment} />
          </Box>
        </Box>
      </Box>

      {/*  Popover anywhere */}
      <Popover
        open={Boolean(anchorEl) && Boolean(popoverContent)}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        disableRestoreFocus
      >
        {popoverContent}
      </Popover>
    </Paper>
  )
}

export default App
