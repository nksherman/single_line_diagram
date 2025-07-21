import { useState } from 'react'
import type { ReactNode } from 'react'
import './App.css'

import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Popover from '@mui/material/Popover'
import Chip from '@mui/material/Chip'
import ReactMarkdown from 'react-markdown'

import Display from './components/display'
import EquipmentCreator from './components/equipmentCreator'

import { EquipmentBase } from './models/equipmentBase'
import Generator from './models/generatorEquipment'
import Transformer from './models/transformerEquipment'
import Bus from './models/busEquipment';

import patchNotesText from '../public/patchHistory.txt?raw'
import extractVersionNumber from './utils/extractVersionNumber'

function defaultEquipment(): EquipmentBase[] {
  EquipmentBase.clearRegistry();

  const generator1 = new Generator('1', 'Generator 1', {
    capacity: 100,
    voltage: 11,
    fuelType: 'natural_gas',
    efficiency: 95,
    isOnline: true
  });
  
  const bus1 = new Bus('2', 'Bus 1', {
    voltage: 11,
  });

  const tx1 = new Transformer('3', 'Transformer 1', {
    primaryVoltage: 11,
    secondaryVoltage: 4.16,
    powerRating: 15,
    phaseCount: 1,
    connectionType: 'Wye',
    impedance: 6.5,
    isOperational: true
  });

  const tx2 = new Transformer('4', 'Transformer 2', {
    primaryVoltage: 11,
    secondaryVoltage: 4.16,
    powerRating: 15,
    phaseCount: 3,
    connectionType: 'Delta',
    impedance: 6.5,
    isOperational: true
  });


  // Connect generators

  EquipmentBase.connectById(generator1.id, bus1.id);
  EquipmentBase.connectById(bus1.id, tx1.id);
  EquipmentBase.connectById(bus1.id, tx2.id);

  return [generator1, bus1, tx1, tx2];
}

const versionNumber = extractVersionNumber(patchNotesText);

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

  /* handle version popover */
  const handleVersionClick = (event: React.MouseEvent<HTMLElement>) => {
    const patchNotesContent = (
      <Box sx={{ p: 2, maxWidth: 600, maxHeight: 400, overflow: 'auto' }}>
        <ReactMarkdown>{patchNotesText}</ReactMarkdown>
      </Box>
    );
    handlePopoverOpen(event.currentTarget, patchNotesContent);
  };

  return (
    <Paper>
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h2">Single Line Diagram</Typography>
          <Chip
            label={versionNumber}
            onClick={handleVersionClick}
            clickable
            variant="outlined"
            sx={{ 
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'action.hover'
              }
            }}
          />
        </Box>
        
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
