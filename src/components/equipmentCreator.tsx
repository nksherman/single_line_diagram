import { useState } from 'react';

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

import { EquipmentBase } from '../models/equipmentBase';
import Generator, { type GeneratorProperties, generatorValidation } from '../models/generatorEquipment';
import Transformer, { type TransformerProperties, transformerValidation } from '../models/transformerEquipment';


interface EquipmentClass {
  name: string;
  properties: string[];
}

function EquipmentCreator({equipmentList, setEquipmentList}: {
  equipmentList: EquipmentBase[],
  setEquipmentList: (equipment: EquipmentBase[]) => void
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
    { name: 'Generator', properties: Generator.inputProperties },
    { name: 'Transformer', properties: Transformer.inputProperties }
  ];

  // Get the selected equipment class
  const selectedClass = baseEquipment.find(eq => eq.name === selectedEquipmentType);

  // Reset form when equipment type changes
  const handleEquipmentTypeChange = (type: string) => {
    setSelectedEquipmentType(type);
    setPropertyValues({});
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

    // Validate based on equipment type
    if (selectedEquipmentType === 'Generator') {
      const props = propertyValues as Partial<GeneratorProperties>;
      generatorValidation(props).forEach(error => errors.push(error));

    } else if (selectedEquipmentType === 'Transformer') {
      const props = propertyValues as Partial<TransformerProperties>;
      transformerValidation(props).forEach(error => errors.push(error));

    }

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
      setSelectedEquipmentType('');
      setEquipmentName('');
      setPropertyValues({});
      setSelectedSources([]);
      setSelectedLoads([]);
      setValidationErrors([]);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setValidationErrors([`Error creating equipment: ${errorMessage}`]);
    }
  };

  // Render input field based on property type
  const renderPropertyInput = (property: string) => {
    const value = propertyValues[property] || '';

    // Special cases for specific properties
    if (property === 'fuelType') {
      return (
        <FormControl fullWidth margin="dense">
          <InputLabel>Fuel Type</InputLabel>
          <Select
            value={value}
            label="Fuel Type"
            onChange={(e) => handlePropertyChange(property, e.target.value)}
          >
            <MenuItem value="natural_gas">Natural Gas</MenuItem>
            <MenuItem value="diesel">Diesel</MenuItem>
            <MenuItem value="solar">Solar</MenuItem>
            <MenuItem value="wind">Wind</MenuItem>
            <MenuItem value="hydro">Hydro</MenuItem>
            <MenuItem value="nuclear">Nuclear</MenuItem>
            <MenuItem value="coal">Coal</MenuItem>
          </Select>
        </FormControl>
      );
    }

    if (property === 'phaseCount') {
      return (
        <FormControl fullWidth margin="dense">
          <InputLabel>Phase Count</InputLabel>
          <Select
            value={value}
            label="Phase Count"
            onChange={(e) => handlePropertyChange(property, Number(e.target.value))}
          >
            <MenuItem value={1}>1</MenuItem>
            <MenuItem value={3}>3</MenuItem>
          </Select>
        </FormControl>
      );
    }

    if (property === 'connectionType') {
      return (
        <FormControl fullWidth margin="dense">
          <InputLabel>Connection Type</InputLabel>
          <Select
            value={value}
            label="Connection Type"
            onChange={(e) => handlePropertyChange(property, e.target.value)}
          >
            <MenuItem value="Delta">Delta</MenuItem>
            <MenuItem value="Wye">Wye</MenuItem>
          </Select>
        </FormControl>
      );
    }

    // Default to number input for numeric properties
    return (
      <TextField
        fullWidth
        margin="dense"
        label={property.charAt(0).toUpperCase() + property.slice(1)}
        type="number"
        value={value}
        onChange={(e) => handlePropertyChange(property, Number(e.target.value))}
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
          {selectedClass.properties.map((property) => (
            <Box key={property}>
              {renderPropertyInput(property)}
            </Box>
          ))}
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