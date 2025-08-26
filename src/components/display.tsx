import {useCallback, type ReactNode } from 'react'

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

function Display({ 
  equipmentList, 
  setEquipmentList, 
  handlePopoverOpen,
  layoutOffsets 
}: { 
  equipmentList: EquipmentBase[]; 
  setEquipmentList: React.Dispatch<React.SetStateAction<EquipmentBase[]>>; 
  handlePopoverOpen: (content: ReactNode, anchorElement: HTMLElement | null) => void;
  layoutOffsets?: {
    sidebarWidth: number;
    drawerWidth: number;
    headerHeight: number;
  };
}) {
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

  const handleDeleteEquipment = (equipment: EquipmentBase) => {
    //remove connections from the equipment
    equipment.sources.forEach(source => {
      source.removeLoad(equipment);
    });
    equipment.loads.forEach(load => {
      load.removeSource(equipment);
    });

    // Remove the equipment from the list
    const updatedList = equipmentList.filter(eq => eq.id !== equipment.id);
    setEquipmentList([...updatedList]);
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
      return true;
    } else {
      console.warn(`Cannot connect: voltage mismatch. Source: ${sourceVoltage}V, Target: ${targetVoltage}V`);
      return false;
    }
  }

  const handleDeleteConnection = (sourceId: string, targetId: string) => {
    const sourceEquipment = equipmentList.find(eq => eq.id === sourceId);
    const targetEquipment = equipmentList.find(eq => eq.id === targetId);

    if (!sourceEquipment || !targetEquipment) {
      console.warn(`Cannot delete connection: source or target not found.`);
      return false;
    }
    
    if (sourceEquipment.loads.has(targetEquipment)) {
      sourceEquipment.removeLoad(targetEquipment);
      
      // Trigger re-render by creating a new array reference
      setEquipmentList([...equipmentList]);
      
      return true;
    } else {
      console.warn(`No connection found between ${sourceEquipment.name} and ${targetEquipment.name}`);
      return false;
    }
  }

  // Create a reliable force update function that uses current state
  const forceCompleteUpdate = useCallback(() => {
    // Force update by creating new array reference with current data
    setEquipmentList(prevList => [...prevList]);
  }, [setEquipmentList]);

  return (
    <ReactFlowLayoutEngine
      equipmentList={equipmentList}
      triggerRerender={forceCompleteUpdate}
      onEditEquipment={handleEditEquipment}
      onDeleteEquipment={handleDeleteEquipment}
      onConnectEquipment={handleConnectEquipment}
      onDeleteConnection={handleDeleteConnection}
      layoutOffsets={layoutOffsets}
    />
  );
}

export default Display;