
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import EquipmentBase from '../models/equipmentBase';
import Generator from '../models/generatorEquipment';
import Bus from '../models/busEquipment';
import Transformer from '../models/transformerEquipment';
import MeterEquipment from '../models/meterEquipment';

import GeneratorEditor from './editor/generatorEditor';
import BusEditor from './editor/busEditor';
import TransformerEditor from './editor/transformerEditor';
import MeterEditor from './editor/meterEditor';

/**
 * Component to edit some equipment after creation.
 * user will click a component, display the equipment,
 * then have buttons to edit it
 * 
 * The user can change the equipment properties and save the changes.
 */

function EditEquipment({ equipmentSubject, equipmentList, setEquipmentList }: { 
  equipmentSubject: EquipmentBase | null; equipmentList: EquipmentBase[]; setEquipmentList: (eq: EquipmentBase[]) => void }) {
    
  // Check if the equipment is a Generator
  if (equipmentSubject instanceof Generator) {
    return (
      <GeneratorEditor
        generator={equipmentSubject}
        equipmentList={equipmentList}
        setEquipmentList={setEquipmentList}
      />
    );
  } else if (equipmentSubject instanceof Bus) {
    return (
      <BusEditor
        bus={equipmentSubject}
        equipmentList={equipmentList}
        setEquipmentList={setEquipmentList}
      />
    );
  } else if (equipmentSubject instanceof Transformer) {
    return (
      <TransformerEditor
        transformer={equipmentSubject}
        equipmentList={equipmentList}
        setEquipmentList={setEquipmentList}
      />
    );
  } else if (equipmentSubject instanceof MeterEquipment) {
    return (
      <MeterEditor
        meter={equipmentSubject}
        equipmentList={equipmentList}
        setEquipmentList={setEquipmentList}
      />
    );
  }

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h6">Edit Equipment</Typography>
      {equipmentSubject ? (
        <>
          <Typography variant="subtitle1">{equipmentSubject.name}</Typography>
          <Typography variant="body2">Type: {equipmentSubject.type}</Typography>
          <Box sx={{ marginTop: 2 }}>
            {/* For non-Generator equipment, show basic info */}
            <Typography>Equipment Count: {equipmentList?.length || 0}</Typography>
            <Typography>Editor for {equipmentSubject.type} equipment is not yet implemented.</Typography>
            <Button 
              variant="outlined" 
              onClick={() => {
                console.log("Save changes for:", equipmentSubject);
              }}
            >
              Save Changes
            </Button>
          </Box>
        </>
      ) : (
        <Typography>No equipment selected</Typography>
      )}
    </Box>
  );
}


export default EditEquipment;