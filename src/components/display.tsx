import {useCallback, type ReactNode } from 'react'

import { EquipmentBase } from '../models/equipmentBase';
import Generator from '../models/generatorEquipment';
import Transformer from '../models/transformerEquipment';
import Meter from '../models/meterEquipment';
import Bus from '../models/busEquipment';
import ReactFlowLayoutEngine from './layoutSLD/flow/flowLayoutEngine';

import EditEquipment from './editEquipment';
import type { EquipmentType } from '../types/equipment.types';

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

    // Remove the equipment from the registry
    equipment.removeFromRegistry();

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

  const handleCreateEquipment = (type: EquipmentType, sourceId: string, targetId: string) => {
    // Generate a unique ID for the new equipment
    const newId = `${type.toLowerCase()}-${Date.now()}`;
    const newName = `${type} ${newId}`;

    // Get source and target equipment to determine voltage
    const sourceEquipment = equipmentList.find(eq => eq.id === sourceId);
    const targetEquipment = equipmentList.find(eq => eq.id === targetId);
    
    if (!sourceEquipment || !targetEquipment) {
      console.warn('Source or target equipment not found for equipment creation');
      return;
    }

    // Get voltages from source and target
    const sourceVoltage = (sourceEquipment as any).voltage || 
                         (sourceEquipment as any).secondaryVoltage || 
                         (sourceEquipment as any).voltageRating || 11;
    const targetVoltage = (targetEquipment as any).voltage || 
                         (targetEquipment as any).primaryVoltage || 
                         (targetEquipment as any).voltageRating || 11;

    // Create new equipment instance with appropriate default properties
    let newEquipment: EquipmentBase;

    // we should abstract the actual creation to disassociate from the models
    
    switch (type) {
      case 'Generator':
        newEquipment = new Generator(newId, newName, {
          capacity: 100,
          voltage: sourceVoltage,
          fuelType: 'natural_gas',
          efficiency: 95,
          isOnline: true
        });
        break;
      case 'Transformer':
        newEquipment = new Transformer(newId, newName, {
          primaryVoltage: sourceVoltage,
          secondaryVoltage: targetVoltage,
          powerRating: 15,
          phaseCount: 3,
          connectionType: 'Wye',
          impedance: 6.5,
          isOperational: true
        });
        break;
      case 'Meter':
        newEquipment = new Meter(newId, newName, {
          voltageRating: Math.min(sourceVoltage, targetVoltage),
          currentRating: 100,
          accuracyClass: '0.5',
          isOperational: true,
        });
        break;
      case 'Bus':
        newEquipment = new Bus(newId, newName, {
          voltage: Math.min(sourceVoltage, targetVoltage),
          allowedSources: 3,
        });
        break;
      default:
        console.warn(`Equipment type ${type} not supported for creation`);
        return;
    }

    // Position the new equipment between source and target
    const sourcePos = sourceEquipment.position;
    const targetPos = targetEquipment.position;
    const newPosition = {
      x: (sourcePos.x + targetPos.x) / 2,
      y: (sourcePos.y + targetPos.y) / 2,
    };
    newEquipment.position = newPosition;

    // Remove the original connection between source and target
    if (sourceEquipment.loads.has(targetEquipment)) {
      sourceEquipment.removeLoad(targetEquipment);
    }

    // Connect source -> new equipment -> target
    sourceEquipment.addLoad(newEquipment);
    newEquipment.addLoad(targetEquipment);

    // Add to equipment list and trigger re-render
    const updatedList = [...equipmentList, newEquipment];
    setEquipmentList(updatedList);

    // Open edit dialog for the new equipment
    handleEditEquipment(newEquipment);
  };

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
      onCreateEquipment={handleCreateEquipment}
      layoutOffsets={layoutOffsets}
    />
  );
}

export default Display;