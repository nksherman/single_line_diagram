import { useCallback } from 'react';
import type { Node } from '@xyflow/react';
import EquipmentBase from '../models/equipmentBase';
import { convertXYToPercentPosition, findNodeByPosition } from './flowPositioning';

interface ConnectionHandlerProps {
  equipmentList: EquipmentBase[];
  triggerRerender?: () => void;
  onConnectEquipment?: (sourceId: string, targetId: string) => boolean;
  layoutOffsets: {
    sidebarWidth: number;
    drawerWidth: number;
    headerHeight: number;
  };
}

/**
 * Custom hook for handling equipment connections and handle repositioning
 */
export const useConnectionHandlers = ({
  equipmentList,
  triggerRerender,
  onConnectEquipment,
  layoutOffsets,
}: ConnectionHandlerProps) => {
  
  const repositionHandle = useCallback((
    equipmentId: string, 
    handleId: string, 
    newPositionPercent: number
  ) => {
    const equipment = equipmentList.find(eq => eq.id === equipmentId);
    if (!equipment) {
      console.warn(`Equipment with ID ${equipmentId} not found`);
      return;
    }

    const currentHandle = equipment.getHandle(handleId);
    if (!currentHandle) {
      console.warn(`Handle with ID ${handleId} not found on equipment ${equipmentId}`);
      return;
    }
    currentHandle.positionPercent = newPositionPercent;

    if (triggerRerender) {
      triggerRerender();
    }
  }, [equipmentList, triggerRerender]);

  const handleConnect = useCallback((params: any) => {
    if (onConnectEquipment) {
      onConnectEquipment(params.source, params.target);
    } else {
      console.warn('No onConnectEquipment handler provided');
    }
  }, [onConnectEquipment]);

  const screenToFlowPosition = useCallback((screenToFlowPositionFn: any, { x, y }: { x: number; y: number }) => {
    const adjustedScreenPosition = {
      x: x + layoutOffsets.sidebarWidth + layoutOffsets.drawerWidth,
      y: y + layoutOffsets.headerHeight
    };
    return screenToFlowPositionFn(adjustedScreenPosition);
  }, [layoutOffsets]);

  const createConnectEndHandler = useCallback((
    screenToFlowPositionFn: any, 
    getNodes: () => Node[]
  ) => (_event: any, params: any) => {
    if (params.toNode) {
      return; // handleConnect is already working
    }
    
    const flowPosition = screenToFlowPosition(screenToFlowPositionFn, params.to);
    const nodes = getNodes();
    const targetNode = findNodeByPosition(flowPosition, nodes);
    
    if (!targetNode) {
      console.log("no Node");
      return;
    }

    if (targetNode.id === params.fromNode.id) {
      const fromHandleId = params.fromHandle?.id || params.fromHandle;

      const equipment = equipmentList.find(eq => eq.id === targetNode.id);
      if (!equipment) {
        console.warn(`Equipment with ID ${targetNode.id} not found`);
        return;
      }

      const handle = equipment.getHandle(fromHandleId);
      if (!handle) {
        console.warn(`Handle with ID ${fromHandleId} not found`);
        console.log('Looking for ', fromHandleId, 'Available handles:', equipment.handles.map((h: any) => h.id));
        return;
      }

      const newPositionPercent = convertXYToPercentPosition({
        node: targetNode,
        xyPosition: flowPosition,
        handleSide: handle.side
      });

      repositionHandle(targetNode.id, fromHandleId, newPositionPercent);
    } else {
      // user dragged to a different node, create a new connection
      params.target = targetNode.id;
      handleConnect(params);
    }
  }, [equipmentList, repositionHandle, handleConnect, screenToFlowPosition]);

  return {
    repositionHandle,
    handleConnect,
    createConnectEndHandler,
    screenToFlowPosition,
  };
};
