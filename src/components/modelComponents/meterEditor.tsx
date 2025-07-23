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
import Meter, { type MeterProperties } from '../../models/meterEquipment';
import { 
  validateVoltageCompatibility,
  validateConnectionLimits,
  validateConnectionConflicts
} from '../../utils/equipmentUtils';

interface MeterEditorProps {
  meter: Meter;
  equipmentList: EquipmentBase[];
  setEquipmentList: (eq: EquipmentBase[]) => void;
  onSave?: () => void;
}

function MeterEditor({ meter, equipmentList, setEquipmentList, onSave }: MeterEditorProps) {
  // Form state
  const [name, setName] = useState(meter.name);
  const [voltageRating, setVoltageRating] = useState(meter.voltageRating);
  const [currentRating, setCurrentRating] = useState(meter.currentRating);
  const [accuracyClass, setAccuracyClass] = useState(meter.accuracyClass);
  const [isOperational, setIsOperational] = useState(meter.isOperational);
  
  // Connection state
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedLoads, setSelectedLoads] = useState<string[]>([]);
  
  // Validation
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Initialize connections
  useEffect(() => {
    setSelectedSources(Array.from(meter.sources).map(eq => eq.id));
    setSelectedLoads(Array.from(meter.loads).map(eq => eq.id));
  }, [meter]);

  // Get available equipment for connections (excluding current meter)
  const availableEquipment = equipmentList.filter(eq => eq.id !== meter.id);

  // Function to validate voltage compatibility using utility
  const validateVoltageCompatibilityLocal = (): string[] => {
    return validateVoltageCompatibility(
      selectedSources,
      selectedLoads,
      equipmentList,
      () => voltageRating, // Meter voltage is the same for both source and load connections
      name
    );
  };

  // Validate all properties
  const validateProperties = (): string[] => {
    const errors: string[] = [];
    
    if (!name.trim()) {
      errors.push('Meter name is required');
    }

    Object.entries(Meter.inputProperties).forEach(([key, prop]) => {
      let value;
      switch (key) {
        case 'voltageRating':
          value = voltageRating;
          break;
        case 'currentRating':
          value = currentRating;
          break;
        case 'accuracyClass':
          value = accuracyClass;
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
      Meter.allowedSources, 
      Meter.allowedLoads, 
      'Meter'
    );
    errors.push(...connectionLimitErrors);

    return errors;
  };

  // Handle connection changes
  const handleConnectionChange = (values: string | string[], isSource: boolean) => {
    const valueArray = typeof values === 'string' ? values.split(',') : values;
    
    if (isSource) {
      const limitErrors = validateConnectionLimits(valueArray, selectedLoads, Meter.allowedSources, Meter.allowedLoads, 'Meter');
      if (limitErrors.length > 0) {
        setValidationErrors(limitErrors);
        return;
      }
      setSelectedSources(valueArray);
    } else {
      const limitErrors = validateConnectionLimits(selectedSources, valueArray, Meter.allowedSources, Meter.allowedLoads, 'Meter');
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
      const connectionErrors = validateConnectionConflicts(sourceEquipment, loadEquipment, meter.id);
      if (connectionErrors.length > 0) {
        throw new Error(connectionErrors.join(', '));
      }

      // Update meter properties
      meter.name = name;
      meter.voltageRating = voltageRating;
      meter.currentRating = currentRating;
      meter.accuracyClass = accuracyClass;
      meter.isOperational = isOperational;

      // Clear existing connections
      Array.from(meter.sources).forEach(source => {
        meter.removeSource(source);
      });
      Array.from(meter.loads).forEach(load => {
        meter.removeLoad(load);
      });

      // Add new connections
      selectedSources.forEach(sourceId => {
        const source = equipmentList.find(eq => eq.id === sourceId);
        if (source) {
          meter.addSource(source);
        }
      });

      selectedLoads.forEach(loadId => {
        const load = equipmentList.find(eq => eq.id === loadId);
        if (load) {
          meter.addLoad(load);
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

  const accuracyClassOptions = ['0.2', '0.5', '1.0', '2.0'];

  return (
    <Box sx={{ p: 2, maxWidth: 600 }}>
      <Typography variant="h6" gutterBottom>
        Edit Meter: {meter.name}
      </Typography>

      {/* Name */}
      <TextField
        fullWidth
        margin="dense"
        label="Meter Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {/* Voltage Rating */}
      <TextField
        fullWidth
        margin="dense"
        label="Voltage Rating (kV)"
        type="number"
        value={voltageRating}
        onChange={(e) => setVoltageRating(Number(e.target.value))}
      />

      {/* Current Rating */}
      <TextField
        fullWidth
        margin="dense"
        label="Current Rating (A)"
        type="number"
        value={currentRating}
        onChange={(e) => setCurrentRating(Number(e.target.value))}
      />

      {/* Accuracy Class */}
      <FormControl fullWidth margin="dense">
        <InputLabel>Accuracy Class</InputLabel>
        <Select
          value={accuracyClass}
          label="Accuracy Class"
          onChange={(e) => setAccuracyClass(e.target.value as MeterProperties['accuracyClass'])}
        >
          {accuracyClassOptions.map((accuracy) => (
            <MenuItem key={accuracy} value={accuracy}>
              Class {accuracy}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Operational Status */}
      <FormControl fullWidth margin="dense">
        <InputLabel>Status</InputLabel>
        <Select
          value={isOperational}
          label="Status"
          onChange={(e) => setIsOperational(e.target.value === 'true')}
        >
          <MenuItem value="true">Operational</MenuItem>
          <MenuItem value="false">Not Operational</MenuItem>
        </Select>
      </FormControl>

      {/* Sources */}
      <FormControl fullWidth margin="dense">
        <InputLabel>Sources (Required)</InputLabel>
        <Select
          multiple
          value={selectedSources}
          onChange={(e) => handleConnectionChange(e.target.value, true)}
          input={<OutlinedInput label="Sources (Required)" />}
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

export default MeterEditor;
