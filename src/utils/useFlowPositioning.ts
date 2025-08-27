import { useCallback } from 'react';
import type { Node } from '@xyflow/react';
import { Position } from '@xyflow/react';
import { 
  screenToFlowPosition as screenToFlowPositionUtil,
  convertXYToPercentPosition as convertXYToPercentPositionUtil,
  findNodeByPosition as findNodeByPositionUtil,
  distanceToLineSegment as distanceToLineSegmentUtil
} from './flowPositioning';

export const useFlowPositioning = (
  nodes: Node[],
  layoutOffsets: { sidebarWidth: number; drawerWidth: number; headerHeight: number }
) => {
  const screenToFlowPosition = useCallback(({
    screenToFlowPositionFn,
    screenPosition,
  }: {
    screenToFlowPositionFn: (pos: { x: number; y: number }) => { x: number; y: number },
    screenPosition: { x: number; y: number },
  }) => {
    return screenToFlowPositionUtil({
      screenToFlowPositionFn,
      screenPosition,
      layoutOffsets
    });
  }, [layoutOffsets]);

  const convertXYToPercentPosition = useCallback(({
    node,
    xyPosition,
    handleSide
  }: {
    node: Node,
    xyPosition: { x: number; y: number },
    handleSide: Position
  }) => {
    return convertXYToPercentPositionUtil({
      node,
      xyPosition,
      handleSide
    });
  }, []);

  const findNodeByPosition = useCallback((
    flowPosition: { x: number; y: number },
    pxlError: number = 10
  ) => {
    return findNodeByPositionUtil(flowPosition, nodes, pxlError);
  }, [nodes]);

  const distanceToLineSegment = useCallback((
    point: { x: number; y: number },
    lineStart: { x: number; y: number },
    lineEnd: { x: number; y: number }
  ) => {
    return distanceToLineSegmentUtil(point, lineStart, lineEnd);
  }, []);

  return {
    screenToFlowPosition,
    convertXYToPercentPosition,
    findNodeByPosition,
    distanceToLineSegment
  };
};
