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

  const handleConnectEquipment = (sourceId: string, targetId: string) => {
    const sourceEquipment = equipmentList.find(eq => eq.id === sourceId);
    const targetEquipment = equipmentList.find(eq => eq.id === targetId);

    if (!sourceEquipment || !targetEquipment) {
      console.warn(`Cannot connect equipment: source or target not found.`);
      return false;
    }

    // Perform all the same validation logic from handleConnect
    const sourceOpen = sourceEquipment.loads.size < sourceEquipment.allowedLoads;
    const targetOpen = targetEquipment.sources.size < targetEquipment.allowedSources;

    // Use the same voltage detection logic as the original code
    const sourceVoltage = (sourceEquipment as any).voltage || 
                         (sourceEquipment as any).secondaryVoltage || 
                         (sourceEquipment as any).voltageRating || 0;
    const targetVoltage = (targetEquipment as any).voltage || 
                         (targetEquipment as any).primaryVoltage || 
                         (targetEquipment as any).voltageRating || 0;

    if (sourceEquipment.loads.has(targetEquipment) || targetEquipment.sources.has(sourceEquipment)) {
      console.warn(`Equipment ${sourceEquipment.name} and ${targetEquipment.name} are already connected.`);
      return false;
    } else if (!sourceOpen) {
      console.warn(`Source equipment ${sourceEquipment.name} cannot have more loads.`);
      return false;
    } else if (!targetOpen) {
      console.warn(`Target equipment ${targetEquipment.name} cannot have more sources.`);
      return false;
    } else if (sourceVoltage === targetVoltage) {
      // Connect the equipment
      sourceEquipment.addLoad(targetEquipment);
      
      // Trigger re-render by creating a new array reference
      setEquipmentList([...equipmentList]);
      
      console.log(`Connected ${sourceEquipment.name} to ${targetEquipment.name}`);
      return true;
    } else {
      console.warn(`Cannot connect: voltage mismatch. Source: ${sourceVoltage}V, Target: ${targetVoltage}V`);
      return false;
    }
  }
  
  return (
    <ReactFlowLayoutEngine
      equipmentList={equipmentList}
      onEditEquipment={handleEditEquipment}
      onConnectEquipment={handleConnectEquipment}
    />
  );
}

export default Display;