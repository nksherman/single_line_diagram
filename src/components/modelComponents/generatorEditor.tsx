import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import OutlinedInput from '@mui/material/OutlinedInput';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';

import EquipmentBase from '../../models/equipmentBase';
import Generator, { type GeneratorProperties } from '../../models/generatorEquipment';
import { 
  validateVoltageCompatibility,
  validateConnectionLimits,
  validateConnectionConflicts
} from '../../utils/equipmentUtils';

interface GeneratorEditorProps {
  generator: Generator;
  equipmentList: EquipmentBase[];
  setEquipmentList: (eq: EquipmentBase[]) => void;
  onSave?: () => void;
}

function GeneratorEditor({ generator, equipmentList, setEquipmentList, onSave }: GeneratorEditorProps) {
  // Form state
  const [name, setName] = useState(generator.name);
  const [capacity, setCapacity] = useState(generator.capacity);
  const [voltage, setVoltage] = useState(generator.voltage);
  const [fuelType, setFuelType] = useState(generator.fuelType);
  const [efficiency, setEfficiency] = useState(generator.efficiency);
  const [isOnline, setIsOnline] = useState(generator.isOnline);
  
  // Connection state
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedLoads, setSelectedLoads] = useState<string[]>([]);
  
  // Validation
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Initialize connections
  useEffect(() => {
    setSelectedSources(Array.from(generator.sources).map(eq => eq.id));
    setSelectedLoads(Array.from(generator.loads).map(eq => eq.id));
  }, [generator]);

  // Get available equipment for connections (excluding current generator)
  const availableEquipment = equipmentList.filter(eq => eq.id !== generator.id);

  // Function to validate voltage compatibility using utility
  const validateVoltageCompatibilityLocal = (): string[] => {
    return validateVoltageCompatibility(
      selectedSources,
      selectedLoads,
      equipmentList,
      () => voltage, // Generator voltage is the same for both source and load connections
      name
    );
  };

  // Validate all properties
  const validateProperties = (): string[] => {
    const errors: string[] = [];
    
    if (!name.trim()) {
      errors.push('Generator name is required');
    }

    Object.entries(Generator.inputProperties).forEach(([key, prop]) => {
      let value;
      switch (key) {
        case 'capacity':
          value = capacity;
          break;
        case 'voltage':
          value = voltage;
          break;
        case 'fuelType':
          value = fuelType;
          break;
        case 'efficiency':
          value = efficiency;
          break;
        default:
          return;
      }

      if (prop.validation) {
        const error = prop.validation(value);
        if (error) {
          errors.push(error);
        }
      }
    });

    // Validate voltage compatibility
    const voltageErrors = validateVoltageCompatibilityLocal();
    errors.push(...voltageErrors);

    // Validate connection limits
    const connectionLimitErrors = validateConnectionLimits(
      selectedSources, 
      selectedLoads, 
      Generator.allowedSources, 
      Generator.allowedLoads, 
      'Generator'
    );
    errors.push(...connectionLimitErrors);

    return errors;
  };

  // Handle connection changes
  const handleConnectionChange = (values: string | string[], isSource: boolean) => {
    const valueArray = typeof values === 'string' ? values.split(',') : values;
    
    if (isSource) {
      const limitErrors = validateConnectionLimits(valueArray, selectedLoads, Generator.allowedSources, Generator.allowedLoads, 'Generator');
      if (limitErrors.length > 0) {
        setValidationErrors(limitErrors);
        return;
      }
      setSelectedSources(valueArray);
    } else {
      const limitErrors = validateConnectionLimits(selectedSources, valueArray, Generator.allowedSources, Generator.allowedLoads, 'Generator');
      if (limitErrors.length > 0) {
        setValidationErrors(limitErrors);
        return;
      }
      setSelectedLoads(valueArray);
    }
  };

  // Save changes
  const handleSave = () => {
    const errors = validateProperties();
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      // Check if connections would cause conflicts
      const sourceEquipment = equipmentList.filter(eq => selectedSources.includes(eq.id));
      const loadEquipment = equipmentList.filter(eq => selectedLoads.includes(eq.id));

      // Use utility function to validate connection conflicts
      const connectionErrors = validateConnectionConflicts(sourceEquipment, loadEquipment, generator.id);
      if (connectionErrors.length > 0) {
        throw new Error(connectionErrors.join(', '));
      }

      // Update generator properties
      generator.name = name;
      generator.capacity = capacity;
      generator.voltage = voltage;
      generator.fuelType = fuelType;
      generator.efficiency = efficiency;
      generator.isOnline = isOnline;

      // Clear existing connections
      Array.from(generator.sources).forEach(source => {
        generator.removeSource(source);
      });
      Array.from(generator.loads).forEach(load => {
        generator.removeLoad(load);
      });

      // Add new connections
      selectedSources.forEach(sourceId => {
        const source = equipmentList.find(eq => eq.id === sourceId);
        if (source) {
          generator.addSource(source);
        }
      });

      selectedLoads.forEach(loadId => {
        const load = equipmentList.find(eq => eq.id === loadId);
        if (load) {
          generator.addLoad(load);
        }
      });

      // Update equipment list to trigger re-render
      setEquipmentList([...equipmentList]);
      setValidationErrors([]);
      
      if (onSave) {
        onSave();
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setValidationErrors([`Error saving changes: ${errorMessage}`]);
    }
  };

  const fuelTypeOptions = ['natural_gas', 'diesel', 'solar', 'wind', 'hydro', 'nuclear', 'coal'];

  return (
    <Box sx={{ p: 2, maxWidth: 600 }}>
      <Typography variant="h6" gutterBottom>
        Edit Generator: {generator.name}
      </Typography>

      {/* Name */}
      <TextField
        fullWidth
        margin="dense"
        label="Generator Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {/* Capacity */}
      <TextField
        fullWidth
        margin="dense"
        label="Capacity (MW)"
        type="number"
        value={capacity}
        onChange={(e) => setCapacity(Number(e.target.value))}
      />

      {/* Voltage */}
      <TextField
        fullWidth
        margin="dense"
        label="Voltage (kV)"
        type="number"
        value={voltage}
        disabled={true} // Fixed voltage for generators
        helperText="Change the voltage at the transformer level"
        onChange={(e) => setVoltage(Number(e.target.value))}
      />

      {/* Fuel Type */}
      <FormControl fullWidth margin="dense">
        <InputLabel>Fuel Type</InputLabel>
        <Select
          value={fuelType}
          label="Fuel Type"
          onChange={(e) => setFuelType(e.target.value as GeneratorProperties['fuelType'])}
        >
          {fuelTypeOptions.map((fuel) => (
            <MenuItem key={fuel} value={fuel}>
              {fuel.replace('_', ' ').toUpperCase()}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Efficiency */}
      <TextField
        fullWidth
        margin="dense"
        label="Efficiency (%)"
        type="number"
        value={efficiency}
        onChange={(e) => setEfficiency(Number(e.target.value))}
      />

      {/* Online Status */}
      <FormControl fullWidth margin="dense">
        <InputLabel>Status</InputLabel>
        <Select
          value={isOnline}
          label="Status"
          onChange={(e) => setIsOnline(e.target.value === 'true')}
        >
          <MenuItem value="true">Online</MenuItem>
          <MenuItem value="false">Offline</MenuItem>
        </Select>
      </FormControl>

      {/* Sources */}
      <FormControl fullWidth margin="dense">
        <InputLabel>Sources (Optional)</InputLabel>
        <Select
          multiple
          value={selectedSources}
          onChange={(e) => handleConnectionChange(e.target.value, true)}
          input={<OutlinedInput label="Sources (Optional)" />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => {
                const equipment = equipmentList.find(eq => eq.id === value);
                return (
                  <Chip key={value} label={equipment?.name || value} />
                );
              })}
            </Box>
          )}
        >
          {availableEquipment.map((equipment) => (
            <MenuItem key={equipment.id} value={equipment.id}>
              {equipment.name} ({equipment.type})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Loads */}
      <FormControl fullWidth margin="dense">
        <InputLabel>Loads (Optional)</InputLabel>
        <Select
          multiple
          value={selectedLoads}
          onChange={(e) => handleConnectionChange(e.target.value, false)}
          input={<OutlinedInput label="Loads (Optional)" />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => {
                const equipment = equipmentList.find(eq => eq.id === value);
                return (
                  <Chip key={value} label={equipment?.name || value} />
                );
              })}
            </Box>
          )}
        >
          {availableEquipment.map((equipment) => (
            <MenuItem key={equipment.id} value={equipment.id}>
              {equipment.name} ({equipment.type})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {validationErrors.map((error, index) => (
            <Alert key={index} severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          ))}
        </Box>
      )}

      {/* Save button */}
      <Button 
        variant="contained" 
        onClick={handleSave}
        sx={{ mt: 2 }}
        disabled={!name.trim()}
      >
        Save Changes
      </Button>
    </Box>
  );
}

export default GeneratorEditor;
