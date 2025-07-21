
import React, { useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import EquipmentBase from '../models/equipmentBase';

/**
 * Component to edit some equipment after creation.
 * user will click a component, display the equipment,
 * then have buttons to edit it
 * 
 * The user can change the equipment properties and save the changes.
 */

function EditEquipment({ equipmentSubject, equipmentList, setEquipmentList }: { 
  equipmentSubject: EquipmentBase | null; equipmentList: EquipmentBase[]; setEquipmentList: (eq: EquipmentBase[]) => void }) {


  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h6">Edit Equipment</Typography>
      {equipmentSubject ? (
        <>
          <Typography variant="subtitle1">{equipmentSubject.name}</Typography>
          <Box sx={{ marginTop: 2 }}>
            {/* Render editable fields for the equipment */}
            {/* Example: */}
            <Typography>Equipment Count: {equipmentList?.length || 0}</Typography>
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