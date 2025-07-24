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

import EquipmentBase from '../../../models/equipmentBase';
import Bus from '../../../models/busEquipment';
import { 
  validateVoltageCompatibility,
  validateConnectionLimits,
  validateConnectionConflicts
} from '../../../utils/equipmentUtils';

interface BusEditorProps {
  bus: Bus;
  equipmentList: EquipmentBase[];
  setEquipmentList: (eq: EquipmentBase[]) => void;
  onSave?: () => void;
}

function BusEditor({ bus, equipmentList, setEquipmentList, onSave }: BusEditorProps) {
  // Form state
  const [name, setName] = useState(bus.name);
  const [voltage, setVoltage] = useState(bus.voltage);
  const [allowedSources, setAllowedSources] = useState(bus.allowedSources);
  const [allowedLoads, setAllowedLoads] = useState(bus.allowedLoads);
  
  // Connection state
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedLoads, setSelectedLoads] = useState<string[]>([]);
  
  // Validation
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Initialize connections
  useEffect(() => {
    setSelectedSources(Array.from(bus.sources).map(eq => eq.id));
    setSelectedLoads(Array.from(bus.loads).map(eq => eq.id));
  }, [bus]);

  // Get available equipment for connections (excluding current bus)
  const availableEquipment = equipmentList.filter(eq => eq.id !== bus.id);

  // Function to validate voltage compatibility using utility
  const validateVoltageCompatibilityLocal = (): string[] => {
    return validateVoltageCompatibility(
      selectedSources,
      selectedLoads,
      equipmentList,
      () => voltage, // Bus voltage is the same for both source and load connections
      name
    );
  };

  // Validate all properties
  const validateProperties = (): string[] => {
    const errors: string[] = [];
    
    if (!name.trim()) {
      errors.push('Bus name is required');
    }

    // Use Bus's static validation
    Object.entries(Bus.inputProperties).forEach(([key, prop]) => {
      let value;
      switch (key) {
        case 'voltage':
          value = voltage;
          break;
        case 'allowedSources':
          value = allowedSources;
          break;
        case 'allowedLoads':
          value = allowedLoads;
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

    // Validate connection limits with current allowedSources/allowedLoads values
    const connectionLimitErrors = validateConnectionLimits(
      selectedSources, 
      selectedLoads, 
      allowedSources, 
      allowedLoads, 
      'Bus'
    );
    errors.push(...connectionLimitErrors);

    return errors;
  };

  // Handle connection changes
  const handleConnectionChange = (values: string | string[], isSource: boolean) => {
    const valueArray = typeof values === 'string' ? values.split(',') : values;
    
    if (isSource) {
      const limitErrors = validateConnectionLimits(valueArray, selectedLoads, allowedSources, allowedLoads, 'Bus');
      if (limitErrors.length > 0) {
        setValidationErrors(limitErrors);
        return;
      }
      setSelectedSources(valueArray);
    } else {
      const limitErrors = validateConnectionLimits(selectedSources, valueArray, allowedSources, allowedLoads, 'Bus');
      if (limitErrors.length > 0) {
        setValidationErrors(limitErrors);
        return;
      }
      setSelectedLoads(valueArray);
    }
  };

  // Handle changes to allowedSources/allowedLoads and validate existing connections
  const handleAllowedConnectionsChange = (value: number, isSource: boolean) => {
    if (isSource) {
      setAllowedSources(value);
      // If reducing allowed sources, validate current selections
      if (value < selectedSources.length) {
        setValidationErrors([`Current source selections (${selectedSources.length}) exceed new limit (${value}). Please reduce selections.`]);
      } else {
        // Clear previous validation errors
        setValidationErrors([]);
      }
    } else {
      setAllowedLoads(value);
      // If reducing allowed loads, validate current selections
      if (value < selectedLoads.length) {
        setValidationErrors([`Current load selections (${selectedLoads.length}) exceed new limit (${value}). Please reduce selections.`]);
      } else {
        // Clear previous validation errors
        setValidationErrors([]);
      }
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
      const connectionErrors = validateConnectionConflicts(sourceEquipment, loadEquipment, bus.id);
      if (connectionErrors.length > 0) {
        throw new Error(connectionErrors.join(', '));
      }

      // Update bus properties
      bus.name = name;
      bus.voltage = voltage;
      bus.allowedSources = allowedSources;
      bus.allowedLoads = allowedLoads;

      // Clear existing connections
      Array.from(bus.sources).forEach(source => {
        bus.removeSource(source);
      });
      Array.from(bus.loads).forEach(load => {
        bus.removeLoad(load);
      });

      // Add new connections
      selectedSources.forEach(sourceId => {
        const source = equipmentList.find(eq => eq.id === sourceId);
        if (source) {
          bus.addSource(source);
        }
      });

      selectedLoads.forEach(loadId => {
        const load = equipmentList.find(eq => eq.id === loadId);
        if (load) {
          bus.addLoad(load);
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

  return (
    <Box sx={{ p: 2, maxWidth: 600 }}>
      <Typography variant="h6" gutterBottom>
        Edit Bus: {bus.name}
      </Typography>

      {/* Name */}
      <TextField
        fullWidth
        margin="dense"
        label="Bus Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {/* Voltage - Locked */}
      <TextField
        fullWidth
        margin="dense"
        label="Voltage (kV)"
        type="number"
        value={voltage}
        disabled={true}
        helperText="Voltage is locked - change at the source equipment level"
        onChange={(e) => setVoltage(Number(e.target.value))}
      />

      {/* Allowed Sources */}
      <TextField
        fullWidth
        margin="dense"
        label="Maximum Source Connections"
        type="number"
        value={allowedSources}
        onChange={(e) => handleAllowedConnectionsChange(Number(e.target.value), true)}
        helperText={`Currently connected sources: ${selectedSources.length}`}
      />

      {/* Allowed Loads */}
      <TextField
        fullWidth
        margin="dense"
        label="Maximum Load Connections"
        type="number"
        value={allowedLoads}
        onChange={(e) => handleAllowedConnectionsChange(Number(e.target.value), false)}
        helperText={`Currently connected loads: ${selectedLoads.length}`}
      />

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

export default BusEditor;
