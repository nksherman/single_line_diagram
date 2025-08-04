import type { ReactNode } from 'react'

import { EquipmentBase } from '../models/equipmentBase';
import ReactFlowLayoutEngine from './layoutSLD/flow/flowLayoutEngine';

import EditEquipment from './editEquipment';

/**
 * Define a space for displaying equipment and connections in a single line diagram.
 * This component will render a Konva stage with various shapes representing
 * electrical equipment and connections.
 * 
 * For now, display all equipment vertically.
 */

function Display({ equipmentList, setEquipmentList, handlePopoverOpen }: { 
  equipmentList: EquipmentBase[]; setEquipmentList: (eq: EquipmentBase[]) => void; handlePopoverOpen: (content: ReactNode, anchorElement: HTMLElement | null) => void }) {

  const handleEditEquipment = (equipmentSubject: EquipmentBase) => {
    // Handle editing of equipment properties
    const editContent = (
      <EditEquipment
        equipmentSubject={equipmentSubject}
        setEquipmentList={setEquipmentList}
        equipmentList={equipmentList}
      />
    );

    handlePopoverOpen(editContent, null);
  }
  
  return (
    <ReactFlowLayoutEngine
      equipmentList={equipmentList}
      onEditEquipment={handleEditEquipment}
    />
  );
}

export default Display;