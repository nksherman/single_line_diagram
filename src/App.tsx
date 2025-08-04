import { useState } from 'react'
import type { ReactNode } from 'react'
import './App.css'

import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Popover from '@mui/material/Popover'
import Chip from '@mui/material/Chip'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Toolbar from '@mui/material/Toolbar'
import BuildIcon from '@mui/icons-material/Build'
import CloseIcon from '@mui/icons-material/Close'
import ReactMarkdown from 'react-markdown'

import Display from './components/display'
import EquipmentCreator from './components/equipmentCreator'

import { EquipmentBase } from './models/equipmentBase'
import Generator from './models/generatorEquipment'
import Transformer from './models/transformerEquipment'
import Meter from './models/meterEquipment'
import Bus from './models/busEquipment';

import patchNotesText from '/patchHistory.txt?raw' 
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
  const generator2 = new Generator('3', 'Generator 2', {
    capacity: 200,
    voltage: 11,
    fuelType: 'natural_gas',
    efficiency: 85,
    isOnline: false
  });
  
  const bus1 = new Bus('4', 'Bus 1', {
    voltage: 11,
    allowedSources: 2,
  });

  const tx1 = new Transformer('5', 'Transformer 1', {
    primaryVoltage: 11,
    secondaryVoltage: 4.16,
    powerRating: 15,
    phaseCount: 1,
    connectionType: 'Wye',
    impedance: 6.5,
    isOperational: true
  });

  const tx2 = new Transformer('6', 'Transformer 2', {
    primaryVoltage: 11,
    secondaryVoltage: 4.16,
    powerRating: 15,
    phaseCount: 3,
    connectionType: 'Delta',
    impedance: 6.5,
    isOperational: true
  });

  const meter1 = new Meter('7', 'Meter 1', {
    voltageRating: 4.16,
    currentRating: 100,
    accuracyClass: '0.5',
    isOperational: true,
  });

  const meter2 = new Meter('8', 'Meter 2', {
    voltageRating: 4.16,
    currentRating: 50,
    accuracyClass: '0.5',
    isOperational: true,
  });

  EquipmentBase.connectById(generator1.id, bus1.id);
  EquipmentBase.connectById(generator2.id, bus1.id);
  EquipmentBase.connectById(bus1.id, tx1.id);
  EquipmentBase.connectById(bus1.id, tx2.id);
  EquipmentBase.connectById(tx1.id, meter1.id);
  EquipmentBase.connectById(tx2.id, meter2.id);

  return [generator1, generator2, bus1, tx1, tx2, meter1, meter2];
}

const versionNumber = extractVersionNumber(patchNotesText);

function App() {
  const [equipment, setEquipment] = useState<EquipmentBase[]>(() => defaultEquipment());
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerContent, setDrawerContent] = useState<ReactNode | null>(null);
  const [drawerTitle, setDrawerTitle] = useState<string>('');

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [popoverContent, setPopoverContent] = useState<ReactNode | null>(null);


  /* handle popout info and formula */  
  const handlePopoverOpen = (content: ReactNode , anchorElement: HTMLElement | null = null) => {
    setPopoverContent(content);
    setAnchorEl(anchorElement);
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
    handlePopoverOpen(patchNotesContent, event.currentTarget );
  };

  /* handle drawer open/close with any content */
  const handleOpenDrawer = (title: string, content: ReactNode) => {
    setDrawerTitle(title);
    setDrawerContent(content);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setDrawerContent(null);
    setDrawerTitle('');
  };

  /* handle equipment creator drawer */
  const handleToggleEquipmentCreator = () => {
    if (isDrawerOpen && drawerTitle === 'Equipment Creator') {
      handleCloseDrawer();
    } else {
      const equipmentCreatorContent = (
        <>
          <EquipmentCreator 
            equipmentList={equipment} 
            setEquipmentList={setEquipment}
          />
          <Button
            onClick={() => console.log('Save equipment:', equipment)}
            sx={{ mt: 2 }}
            variant="contained"
            fullWidth
          >
            Save
          </Button>
        </>
      );
      handleOpenDrawer('Equipment Creator', equipmentCreatorContent);
    }
  };

  return (
    <Box 
      id="app-container"
      sx={{
        backgroundColor: 'background.paper',
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        p: 0,
        m: 0,
      }}
    >
      {/* Header */}
      <Box 
        id="header"
        sx={{ 
          flexShrink: 0,
          borderBottom: 1, 
          borderColor: 'divider',
      }}>
        <Paper sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          px: 1, 
          py: 1,
          elevation: 1
        }}>
          <Typography variant="h4" component="h1">Single Line Diagram</Typography>
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
        </Paper>
      </Box>

      {/* Main Content */}
      <Box sx={{ 
        display: 'flex', 
        flex: 1,
        overflow: 'hidden'
      }}>
        {/* Sidebar */}
        <Box
          sx={{
            width: 60,
            flexShrink: 0,
            backgroundColor: 'grey.100',
            borderRight: 1,
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 2,
          }}
        >
          <IconButton
            onClick={handleToggleEquipmentCreator}
            sx={{
              mb: 2,
              backgroundColor: isDrawerOpen && drawerTitle === 'Equipment Creator' ? 'primary.main' : 'transparent',
              color: isDrawerOpen && drawerTitle === 'Equipment Creator' ? 'white' : 'text.primary',
              '&:hover': {
                backgroundColor: isDrawerOpen && drawerTitle === 'Equipment Creator' ? 'primary.dark' : 'grey.200',
              },
            }}
          >
            <BuildIcon />
          </IconButton>
        </Box>

        

        {/* Drawer - Persistent variant allows interaction with both drawer and display */}
        <Drawer
          anchor="left"
          open={isDrawerOpen}
          variant="persistent"
          sx={{
            width: isDrawerOpen ? 400 : 0,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 400,
              marginLeft: '60px', // Account for sidebar width
              height: '100%', // Use 100% instead of 100vh to fit within the main content area
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              borderRight: 1,
              borderColor: 'divider',
            },
          }}
        >
          <Toolbar
            sx={{
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              px: 2,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography variant="h6">{drawerTitle}</Typography>
            <IconButton onClick={handleCloseDrawer}>
              <CloseIcon />
            </IconButton>
          </Toolbar>
          <Box sx={{ 
            p: 2, 
            flex: 1,
            overflow: 'auto'
          }}>
            {drawerContent}
          </Box>
        </Drawer>

        {/* Display Area - Adjusts width based on drawer state */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'hidden',
          position: 'relative',
          transition: 'margin 0.3s ease-in-out',
          marginLeft: isDrawerOpen ? 0 : 0, // Smooth transition when drawer opens/closes
        }}>
          <Display 
            equipmentList={equipment} 
            setEquipmentList={setEquipment}
            handlePopoverOpen={handlePopoverOpen}
          />
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{
        flexShrink: 0,
        borderTop: 1,
        borderColor: 'divider',
        px: 2,
        py: 1,
        backgroundColor: 'grey.50',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="caption" color="text.secondary">
          © 2025 Single Line Diagram Tool
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Equipment Count: {equipment.length}
        </Typography>
      </Box>

      {/*  Popover entire screen */}
      <Popover
        open={Boolean(popoverContent)}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={anchorEl ? {
          vertical: 'bottom',
          horizontal: 'left',
        } : {
          vertical: 'center',
          horizontal: 'center',
        }}
        transformOrigin={anchorEl ? {
          vertical: 'top',
          horizontal: 'right',
        } : {
          vertical: 'center',
          horizontal: 'center',
        }}
        disableRestoreFocus
        {...(!anchorEl && {
          sx: {
            '& .MuiPopover-paper': {
              position: 'fixed',
              top: '70%',
              left: '70%',
              transform: 'translate(-70%, -70%)',
            }
          }
        })}
      >
        {popoverContent}
      </Popover>
    </Box>
  )
}

export default App
