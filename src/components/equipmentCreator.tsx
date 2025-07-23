import { useState } from 'react';
import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import OutlinedInput from '@mui/material/OutlinedInput';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';

import { EquipmentBase, type PropertyDefinition } from '../models/equipmentBase';
import Generator, { type GeneratorProperties } from '../models/generatorEquipment';
import Transformer, { type TransformerProperties } from '../models/transformerEquipment';
import Bus, { type BusProperties } from '../models/busEquipment';
import Meter, {type MeterProperties} from '../models/meterEquipment';
import { 
  validateVoltageCompatibility, 
  getCurrentEquipmentVoltage,
  validateConnectionLimits,
  validateConnectionConflicts
} from '../utils/equipmentUtils';


interface EquipmentClass {
  name: string;  
  inputProperties: Record<string, PropertyDefinition>;
  maxSource: number;
  maxLoad: number;
}

// Define available equipment classes
const baseEquipment: EquipmentClass[] = [
  { 
    name: 'Generator', 
    inputProperties: Generator.inputProperties,
    maxSource: Generator.allowedSources,
    maxLoad: Generator.allowedLoads,
  },
  { 
    name: 'Transformer', 
    inputProperties: Transformer.inputProperties,
    maxSource: Transformer.allowedSources,
    maxLoad: Transformer.allowedLoads,
  },
  { 
    name: 'Bus', 
    inputProperties: Bus.inputProperties,
    maxSource: Bus.allowedSources,
    maxLoad: Bus.allowedLoads,
  },
  {
    name: "Meter",
    inputProperties: Meter.inputProperties,
    maxSource: Meter.allowedSources,
    maxLoad: Meter.allowedLoads,
  }
];

function EquipmentCreator({equipmentList, setEquipmentList}: {
  equipmentList: EquipmentBase[],
  setEquipmentList: (equipment: EquipmentBase[]) => void,
}) {
  // State for form
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<string>('');
  const [equipmentName, setEquipmentName] = useState<string>('');
  const [propertyValues, setPropertyValues] = useState<Record<string, any>>({});
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedLoads, setSelectedLoads] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);


  // Get the selected equipment class
  const selectedClass = baseEquipment.find(eq => eq.name === selectedEquipmentType);

  // Function to validate voltage compatibility using utility
  const validateVoltageCompatibilityLocal = (): string[] => {
    return validateVoltageCompatibility(
      selectedSources,
      selectedLoads,
      equipmentList,
      (connectionType) => getCurrentEquipmentVoltage(selectedEquipmentType, propertyValues, connectionType),
      equipmentName
    );
  };

  // Reset form when equipment type changes
  const handleEquipmentTypeChange = (type: string) => {
    setSelectedEquipmentType(type);
    const selectedClass = baseEquipment.find(eq => eq.name === type);
    if (selectedClass) {
      // Set default values from property definitions
      const defaultValues: Record<string, any> = {};
      Object.entries(selectedClass.inputProperties).forEach(([key, prop]) => {
        if (prop.defaultValue !== undefined) {
          defaultValues[key] = prop.defaultValue;
        }
      });
      setPropertyValues(defaultValues);
    } else {
      setPropertyValues({});
    }
    setValidationErrors([]);
  };

  // Handle property value changes
  const handlePropertyChange = (property: string, value: any) => {
    setPropertyValues(prev => ({
      ...prev,
      [property]: value
    }));
  };

  // handle multiple selects for loads/sources
  const handleSelectChange = (values: string | string[], source: boolean = false) => {
    if (!selectedClass) return;

    const valueArray = typeof values === 'string' ? values.split(',') : values;
    const maxSources = selectedClass.maxSource || 0;
    const maxLoads = selectedClass.maxLoad || 0;

    if (source) {
      // Use utility function to validate connection limits
      const connectionErrors = validateConnectionLimits(valueArray, selectedLoads, maxSources, maxLoads, selectedClass.name);
      if (connectionErrors.length > 0) {
        setValidationErrors(connectionErrors);
        return;
      }
      setSelectedSources(valueArray);
    } else {
      // Use utility function to validate connection limits
      const connectionErrors = validateConnectionLimits(selectedSources, valueArray, maxSources, maxLoads, selectedClass.name);
      if (connectionErrors.length > 0) {
        setValidationErrors(connectionErrors);
        return;
      }
      setSelectedLoads(valueArray);
    }
  };
  

  // Validate properties based on equipment type
  const validateProperties = (): string[] => {
    const errors: string[] = [];
    
    if (!equipmentName.trim()) {
      errors.push('Equipment name is required');
    }

    if (!selectedClass) {
      errors.push('Please select an equipment type');
      return errors;
    }

    // Validate individual properties using their validation functions
    Object.entries(selectedClass.inputProperties).forEach(([key, prop]) => {
      const value = propertyValues[key];
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

    return errors;
  };

  // Handle equipment creation
  const handleCreateEquipment = () => {
    const errors = validateProperties();
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (!selectedClass) return;

    try {
      // Check for multi-source scenario and check if intermediate bus is needed
      const sourceEquipment: EquipmentBase[] = equipmentList.filter(eq => selectedSources.includes(eq.id));
      const loadEquipment: EquipmentBase[] = equipmentList.filter(eq => selectedLoads.includes(eq.id));

      // Use utility function to validate connection conflicts
      const connectionErrors = validateConnectionConflicts(sourceEquipment, loadEquipment);
      if (connectionErrors.length > 0) {
        throw new Error('Consider a Bus: ' + connectionErrors.join(', '));
      }

      // Generate unique ID
      const id = `${selectedEquipmentType.toLowerCase()}_${Date.now()}`;
      
      let newEquipment: EquipmentBase;
      
      if (selectedEquipmentType === 'Generator') {
        const props = {
          ...propertyValues,
          isOnline: false // Default state
        } as GeneratorProperties;
        newEquipment = new Generator(id, equipmentName, props);

      } else if (selectedEquipmentType === 'Transformer') {
        const props = {
          ...propertyValues,
          isOperational: false // Default state
        } as TransformerProperties;
        newEquipment = new Transformer(id, equipmentName, props);

      } else if (selectedEquipmentType === 'Bus') {
        const props = {
          ...propertyValues
        } as BusProperties;
        newEquipment = new Bus(id, equipmentName, props);

      } else if (selectedEquipmentType === 'Meter') {
        const props = {
          ...propertyValues,
          isOperational: false // Default state
        } as MeterProperties;
        newEquipment = new Meter(id, equipmentName, props);

      } else {
        throw new Error('Unsupported equipment type');
      }

      // Add connections
      selectedSources.forEach(sourceId => {
        const source = equipmentList.find(eq => eq.id === sourceId);
        if (source) {
          newEquipment.addSource(source);
        }
      });

      selectedLoads.forEach(loadId => {
        const load = equipmentList.find(eq => eq.id === loadId);
        if (load) {
          newEquipment.addLoad(load);
        }
      });

      // Add to equipment list
      setEquipmentList([...equipmentList, newEquipment]);

      // Reset form
      resetForm();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setValidationErrors([`Error creating equipment: ${errorMessage}`]);
    }
  };

  // Helper function to reset form
  const resetForm = () => {
    setSelectedEquipmentType('');
    setEquipmentName('');
    setPropertyValues({});
    setSelectedSources([]);
    setSelectedLoads([]);
    setValidationErrors([]);
  };

  // Render input field based on property definition
  const renderPropertyInput = (propertyKey: string, propertyDef: PropertyDefinition) => {
    const value = propertyValues[propertyKey] || propertyDef.defaultValue || '';

    if (propertyDef.type === 'select') {
      return (
        <FormControl fullWidth margin="dense" key={propertyKey}>
          <InputLabel>{propertyDef.label}</InputLabel>
          <Select
            value={value}
            label={propertyDef.label}
            onChange={(e) => handlePropertyChange(propertyKey, e.target.value)}
          >
            {propertyDef.options?.map((option) => (
              <MenuItem key={option} value={option}>
                {typeof option === 'string' ? option.replace('_', ' ').toUpperCase() : option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    if (propertyDef.type === 'number') {
      return (
        <TextField
          key={propertyKey}
          fullWidth
          margin="dense"
          label={propertyDef.label}
          type="number"
          value={value}
          onChange={(e) => handlePropertyChange(propertyKey, Number(e.target.value))}
        />
      );
    }

    if (propertyDef.type === 'string') {
      return (
        <TextField
          key={propertyKey}
          fullWidth
          margin="dense"
          label={propertyDef.label}
          type="text"
          value={value}
          onChange={(e) => handlePropertyChange(propertyKey, e.target.value)}
        />
      );
    }

    if (propertyDef.type === 'boolean') {
      return (
        <FormControl fullWidth margin="dense" key={propertyKey}>
          <InputLabel>{propertyDef.label}</InputLabel>
          <Select
            value={value}
            label={propertyDef.label}
            onChange={(e) => handlePropertyChange(propertyKey, e.target.value === 'true')}
          >
            <MenuItem value="true">Yes</MenuItem>
            <MenuItem value="false">No</MenuItem>
          </Select>
        </FormControl>
      );
    }

    // Default fallback
    return (
      <TextField
        key={propertyKey}
        fullWidth
        margin="dense"
        label={propertyDef.label}
        value={value}
        onChange={(e) => handlePropertyChange(propertyKey, e.target.value)}
      />
    );
  };
  
  return (
    <Box sx={{ p: 2, maxWidth: 600 }}>
      <Typography variant="h6" gutterBottom>
        Create Equipment
      </Typography>

      {/* Equipment Name */}
      <TextField
        fullWidth
        margin="dense"
        label="Equipment Name"
        value={equipmentName}
        onChange={(e) => setEquipmentName(e.target.value)}
      />

      {/* Select an equipment type */}
      <FormControl fullWidth margin="dense">
        <InputLabel>Equipment Type</InputLabel>
        <Select
          value={selectedEquipmentType}
          label="Equipment Type"
          onChange={(e) => handleEquipmentTypeChange(e.target.value)}
        >
          {baseEquipment.map((eq) => (
            <MenuItem key={eq.name} value={eq.name}>
              {eq.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Dynamic input properties for selected equipment */}
      {selectedClass && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Equipment Properties
          </Typography>
          {Object.entries(selectedClass.inputProperties).map(([propertyKey, propertyDef]) =>
            renderPropertyInput(propertyKey, propertyDef)
          )}
        </Box>
      )}

      {/* Select sources */}
      <FormControl fullWidth margin="dense">
        <InputLabel>Sources (Optional)</InputLabel>
        <Select
          multiple
          value={selectedSources}
          onChange={(e) => handleSelectChange(e.target.value, true)}
          input={<OutlinedInput label="Sources (Optional)" />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => {
                const equipment = equipmentList.find(eq => eq.id === value);
                return (
                  <Chip key={value} label={equipment?.name || value} size="small" />
                );
              })}
            </Box>
          )}
        >
          {equipmentList.map((equipment) => (
            <MenuItem key={equipment.id} value={equipment.id}>
              {equipment.name} ({equipment.type})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Select loads */}
      <FormControl fullWidth margin="dense">
        <InputLabel>Loads (Optional)</InputLabel>
        <Select
          multiple
          value={selectedLoads}
          onChange={(e) => handleSelectChange(e.target.value, false)}
          input={<OutlinedInput label="Loads (Optional)" />}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => {
                const equipment = equipmentList.find(eq => eq.id === value);
                return (
                  <Chip key={value} label={equipment?.name || value} size="small" />
                );
              })}
            </Box>
          )}
        >
          {equipmentList.map((equipment) => (
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

      {/* Create button */}
      <Button 
        variant="contained" 
        onClick={handleCreateEquipment}
        sx={{ mt: 2 }}
        disabled={!selectedEquipmentType || !equipmentName.trim()}
      >
        Create Equipment
      </Button>
    </Box>
  );
}

export default EquipmentCreator;