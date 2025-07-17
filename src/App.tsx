import { useState } from 'react'
import './App.css'

import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'

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
  // initialize with 2 equipment items
  const [equipment, setEquipment] = useState<EquipmentBase[]>(() => defaultEquipment());

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
          </Box>
          
          {/* Display */}
          <Box sx={{ flex: 1 }}>
            <Display equipment={equipment} />
          </Box>
        </Box>
      </Box>
    </Paper>
  )
}

export default App
