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


interface EquipmentClass {
  name: string;
  inputProperties: Record<string, PropertyDefinition>;
}

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

  // Define available equipment classes
  const baseEquipment: EquipmentClass[] = [
    { 
      name: 'Generator', 
      inputProperties: Generator.inputProperties,
    },
    { 
      name: 'Transformer', 
      inputProperties: Transformer.inputProperties,
    },
    { 
      name: 'Bus', 
      inputProperties: Bus.inputProperties,
    }
  ];

  // Get the selected equipment class
  const selectedClass = baseEquipment.find(eq => eq.name === selectedEquipmentType);

  // Utility function to get equipment voltage
  const getEquipmentVoltage = (equipment: EquipmentBase, connectionType: 'source' | 'load'): number | null => {
    if (equipment instanceof Generator) {
      return equipment.voltage;
    } else if (equipment instanceof Transformer) {
      // For transformers, use primary voltage for source connections and secondary for load connections
      return connectionType === 'source' ? equipment.primaryVoltage : equipment.secondaryVoltage;
    } else if (equipment instanceof Bus) {
      return equipment.voltage;
    }
    return null;
  };

  // Utility function to get current equipment voltage
  const getCurrentEquipmentVoltage = (connectionType: 'source' | 'load'): number | null => {
    if (!selectedClass) return null;

    if (selectedEquipmentType === 'Generator') {
      return propertyValues.voltage || 0;
    } else if (selectedEquipmentType === 'Transformer') {
      // For transformers, use primary voltage for source connections and secondary for load connections
      return connectionType === 'source' 
        ? (propertyValues.primaryVoltage || 0) 
        : (propertyValues.secondaryVoltage || 0);
    } else if (selectedEquipmentType === 'Bus') {
      return propertyValues.voltage || 0;
    }
    return null;
  };

  // Function to validate voltage compatibility
  const validateVoltageCompatibility = (): string[] => {
    const errors: string[] = [];

    // Check source voltage compatibility
    selectedSources.forEach(sourceId => {
      const sourceEquipment = equipmentList.find(eq => eq.id === sourceId);
      if (sourceEquipment) {
        const sourceVoltage = getEquipmentVoltage(sourceEquipment, 'load'); // Source provides load-side voltage to us
        const ourVoltage = getCurrentEquipmentVoltage('source'); // We receive on our source-side
        
        if (sourceVoltage !== null && ourVoltage !== null && sourceVoltage !== ourVoltage) {
          errors.push(`Voltage mismatch: ${sourceEquipment.name} provides ${sourceVoltage}kV but ${equipmentName} expects ${ourVoltage}kV on source side`);
        }
      }
    });

    // Check load voltage compatibility
    selectedLoads.forEach(loadId => {
      const loadEquipment = equipmentList.find(eq => eq.id === loadId);
      if (loadEquipment) {
        const loadVoltage = getEquipmentVoltage(loadEquipment, 'source'); // Load expects source-side voltage from us
        const ourVoltage = getCurrentEquipmentVoltage('load'); // We provide on our load-side
        
        if (loadVoltage !== null && ourVoltage !== null && loadVoltage !== ourVoltage) {
          errors.push(`Voltage mismatch: ${equipmentName} provides ${ourVoltage}kV but ${loadEquipment.name} expects ${loadVoltage}kV`);
        }
      }
    });

    return errors;
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
    const voltageErrors = validateVoltageCompatibility();
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

      if (sourceEquipment.some(eq => (eq.loads.size >= eq.allowedLoads) )) {
        // I should clarify which sources have loads, and log them
        throw new Error('Consider a Bus: Some selected sources cannot add load: ' + sourceEquipment.filter(eq => eq.loads.size > 0).map(eq => eq.name).join(', '));
      }

      if (loadEquipment.some(eq => (eq.sources.size >= eq.allowedSources))) {
        // I should clarify which loads have sources, and log them
        throw new Error('Consider a Bus: Some selected loads cannot add sources: ' + loadEquipment.filter(eq => eq.sources.size > 0).map(eq => eq.name).join(', '));
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
          onChange={(e) => setSelectedSources(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
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
          onChange={(e) => setSelectedLoads(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
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