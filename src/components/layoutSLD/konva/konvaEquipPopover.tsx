import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import EquipmentBase from '../../../models/equipmentBase';


function KonvaEquipInfo({equipment, onEdit}: { equipment: EquipmentBase, onEdit: (equipment: EquipmentBase) => void }) {
  if (!equipment) return null;

  // Get all properties, excluding base class methods and internal properties
  const getEquipmentProperties = (equipment: EquipmentBase) => {
    const properties: Array<{ key: string; value: any }> = [];
    const excludeKeys = ['id','name','metadata','_sources','_loads'];
    
    for (const key in equipment) {
      if (
        equipment.hasOwnProperty(key) &&
        !excludeKeys.includes(key) &&
        typeof (equipment as any)[key] !== 'function'
      ) {
        properties.push({
          key: key,
          value: (equipment as any)[key]
        });
      }
    }
    
    return properties;
  };


  // Format property names for display
  const formatPropertyName = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim();
  };

  // Format property values for display
  const formatPropertyValue = (value: any): string => {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (typeof value === 'string') {
      return value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return String(value);
  };

  const properties = getEquipmentProperties(equipment);

  return (
    <Box sx={{ minWidth: 250, padding: 1 }}>
      <Typography variant="h6" sx={{ marginBottom: 1, fontWeight: 'bold' }}>
        {equipment.name} ({equipment.type})
      </Typography>
      
      {properties.map(({ key, value }) => (
        <Box 
          key={key} 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginBottom: 0.5,
            padding: 0.5,
            borderRadius: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.02)'
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {formatPropertyName(key)}:
          </Typography>
          <Typography variant="body2">
            {formatPropertyValue(value)}
          </Typography>
        </Box>
      ))}
      
      <Button
        onClick={() => onEdit(equipment)}
        variant="outlined"
        size="small"
        sx={{ marginTop: 1, width: '100%' }}
      >
        Edit Equipment
      </Button>
    </Box>
  );
}

export default KonvaEquipInfo;