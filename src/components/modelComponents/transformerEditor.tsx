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
import Transformer, { type TransformerProperties } from '../../models/transformerEquipment';
import { 
  validateVoltageCompatibility,
  validateConnectionLimits,
  validateConnectionConflicts
} from '../../utils/equipmentUtils';

interface TransformerEditorProps {
  transformer: Transformer;
  equipmentList: EquipmentBase[];
  setEquipmentList: (eq: EquipmentBase[]) => void;
  onSave?: () => void;
}

function TransformerEditor({ transformer, equipmentList, setEquipmentList, onSave }: TransformerEditorProps) {
  // Form state
  const [name, setName] = useState(transformer.name);
  const [primaryVoltage, setPrimaryVoltage] = useState(transformer.primaryVoltage);
  const [secondaryVoltage, setSecondaryVoltage] = useState(transformer.secondaryVoltage);
  const [powerRating, setPowerRating] = useState(transformer.powerRating);
  const [phaseCount, setPhaseCount] = useState(transformer.phaseCount);
  const [connectionType, setConnectionType] = useState(transformer.connectionType);
  const [impedance, setImpedance] = useState(transformer.impedance);
  const [isOperational, setIsOperational] = useState(transformer.isOperational);
  
  // Connection state
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedLoads, setSelectedLoads] = useState<string[]>([]);
  
  // Validation
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Initialize connections
  useEffect(() => {
    setSelectedSources(Array.from(transformer.sources).map(eq => eq.id));
    setSelectedLoads(Array.from(transformer.loads).map(eq => eq.id));
  }, [transformer]);

  // Get available equipment for connections (excluding current transformer)
  const availableEquipment = equipmentList.filter(eq => eq.id !== transformer.id);

  // Function to validate voltage compatibility using utility
  const validateVoltageCompatibilityLocal = (): string[] => {
    return validateVoltageCompatibility(
      selectedSources,
      selectedLoads,
      equipmentList,
      (connectionType: "source" | "load") => connectionType === "source" ? primaryVoltage : secondaryVoltage, // Use primary voltage for sources, secondary for loads
      name
    );
  };

  // Validate all properties
  const validateProperties = (): string[] => {
    const errors: string[] = [];
    
    if (!name.trim()) {
      errors.push('Transformer name is required');
    }

    Object.entries(Transformer.inputProperties).forEach(([key, prop]) => {
      let value;
      switch (key) {
        case 'primaryVoltage':
          value = primaryVoltage;
          break;
        case 'secondaryVoltage':
          value = secondaryVoltage;
          break;
        case 'powerRating':
          value = powerRating;
          break;
        case 'phaseCount':
          value = phaseCount;
          break;
        case 'connectionType':
          value = connectionType;
          break;
        case 'impedance':
          value = impedance;
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
      Transformer.allowedSources, 
      Transformer.allowedLoads, 
      'Transformer'
    );
    errors.push(...connectionLimitErrors);

    return errors;
  };

  // Handle connection changes
  const handleConnectionChange = (values: string | string[], isSource: boolean) => {
    const valueArray = typeof values === 'string' ? values.split(',') : values;
    
    if (isSource) {
      const limitErrors = validateConnectionLimits(valueArray, selectedLoads, Transformer.allowedSources, Transformer.allowedLoads, 'Transformer');
      if (limitErrors.length > 0) {
        setValidationErrors(limitErrors);
        return;
      }
      setSelectedSources(valueArray);
    } else {
      const limitErrors = validateConnectionLimits(selectedSources, valueArray, Transformer.allowedSources, Transformer.allowedLoads, 'Transformer');
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
      const connectionErrors = validateConnectionConflicts(sourceEquipment, loadEquipment, transformer.id);
      if (connectionErrors.length > 0) {
        throw new Error(connectionErrors.join(', '));
      }

      // Update transformer properties
      transformer.name = name;
      transformer.primaryVoltage = primaryVoltage;
      transformer.secondaryVoltage = secondaryVoltage;
      transformer.powerRating = powerRating;
      transformer.phaseCount = phaseCount;
      transformer.connectionType = connectionType;
      transformer.impedance = impedance;
      transformer.isOperational = isOperational;

      // Clear existing connections
      Array.from(transformer.sources).forEach(source => {
        transformer.removeSource(source);
      });
      Array.from(transformer.loads).forEach(load => {
        transformer.removeLoad(load);
      });

      // Add new connections
      selectedSources.forEach(sourceId => {
        const source = equipmentList.find(eq => eq.id === sourceId);
        if (source) {
          transformer.addSource(source);
        }
      });

      selectedLoads.forEach(loadId => {
        const load = equipmentList.find(eq => eq.id === loadId);
        if (load) {
          transformer.addLoad(load);
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

  const connectionTypeOptions = ['Delta', 'Wye'];
  const phaseCountOptions = [1, 3];

  return (
    <Box sx={{ p: 2, maxWidth: 600 }}>
      <Typography variant="h6" gutterBottom>
        Edit Transformer: {transformer.name}
      </Typography>

      {/* Name */}
      <TextField
        fullWidth
        margin="dense"
        label="Transformer Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {/* Primary Voltage */}
      <TextField
        fullWidth
        margin="dense"
        label="Primary Voltage (kV)"
        type="number"
        value={primaryVoltage}
        onChange={(e) => setPrimaryVoltage(Number(e.target.value))}
      />

      {/* Secondary Voltage */}
      <TextField
        fullWidth
        margin="dense"
        label="Secondary Voltage (kV)"
        type="number"
        value={secondaryVoltage}
        onChange={(e) => setSecondaryVoltage(Number(e.target.value))}
      />

      {/* Power Rating */}
      <TextField
        fullWidth
        margin="dense"
        label="Power Rating (MVA)"
        type="number"
        value={powerRating}
        onChange={(e) => setPowerRating(Number(e.target.value))}
      />

      {/* Phase Count */}
      <FormControl fullWidth margin="dense">
        <InputLabel>Phase Count</InputLabel>
        <Select
          value={phaseCount}
          label="Phase Count"
          onChange={(e) => setPhaseCount(Number(e.target.value) as 1 | 3)}
        >
          {phaseCountOptions.map((phase) => (
            <MenuItem key={phase} value={phase}>
              {phase} Phase
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Connection Type */}
      <FormControl fullWidth margin="dense">
        <InputLabel>Connection Type</InputLabel>
        <Select
          value={connectionType}
          label="Connection Type"
          onChange={(e) => setConnectionType(e.target.value as TransformerProperties['connectionType'])}
        >
          {connectionTypeOptions.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Impedance */}
      <TextField
        fullWidth
        margin="dense"
        label="Impedance (%)"
        type="number"
        value={impedance}
        onChange={(e) => setImpedance(Number(e.target.value))}
      />

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
        <InputLabel>Loads (Required)</InputLabel>
        <Select
          multiple
          value={selectedLoads}
          onChange={(e) => handleConnectionChange(e.target.value, false)}
          input={<OutlinedInput label="Loads (Required)" />}
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

export default TransformerEditor;
