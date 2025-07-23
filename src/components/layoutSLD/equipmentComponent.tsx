import type { ReactNode } from 'react'
import useImage from 'use-image';

import { Group, Rect, Text, Image } from 'react-konva';

import type { DisplayNode, TextElement } from './displayAdapter';
import type EquipmentBase from '../../models/equipmentBase';
import KonvaEquipInfo from './konvaEquipPopover';


interface PopoverPosition {
  x: number;
  y: number;
}

interface EquipmentComponentProps {
  node: DisplayNode;
  handleKonvaPopoverOpen: (position: PopoverPosition, content: ReactNode) => void;
  handleEditEquipment: () => void;
}

function EquipmentComponent({ node, handleKonvaPopoverOpen, handleEditEquipment }: EquipmentComponentProps) {
  const [image] = useImage(node.iconPath);

  const getTextPosition = (textElement: TextElement) => {
    const { position, align, offset = { x: 0, y: 0 } } = textElement;
    const { width, height } = node.size;
    
    let x = 0;
    let y = 0;
    let offsetX = 0;

    switch (position) {
      case 'top':
        x = width / 2;
        y = -15;
        break;
      case 'bottom':
        x = width / 2;
        y = height + 15;
        break;
      case 'left':
        x = -10;
        y = height / 2;
        break;
      case 'right':
        x = width + 10;
        y = height / 2;
        break;
      case 'top-left':
        x = 0;
        y = -15;
        break;
      case 'top-right':
        x = width;
        y = -15;
        break;
      case 'bottom-left':
        x = 0;
        y = height + 15;
        break;
      case 'bottom-right':
        x = width;
        y = height + 15;
        break;
      case 'left-top':
        x = -10;
        y = 0;
        break;
      case 'left-bottom':
        x = -10;
        y = height;
        break;
      case 'right-top':
        x = width + 10;
        y = 0;
        break;
      case 'right-bottom':
        x = width + 10;
        y = height;
        break;
      default:
        x = width / 2;
        y = height / 2;
        break;
    }

    // Handle text alignment with approximate character width
    const charWidth = (textElement.fontSize || 12) * 0.6;
    switch (align) {
      case 'left':
        offsetX = 0;
        break;
      case 'center':
        offsetX = (textElement.text.length * charWidth) / 2;
        break;
      case 'right':
        offsetX = textElement.text.length * charWidth;
        break;
    }

    return {
      x: x + offset.x,
      y: y + offset.y,
      offsetX
    };
  };

  const handleClick = (event: any) => {
    // call the popover event with the node's properties
    event.evt.stopPropagation();
    event.evt.preventDefault();
    
    const content = (
      <KonvaEquipInfo
        equipment={node.equipment}
        onEdit={() => handleEditEquipment()}
      />
    );
    
    // Use mouse position for popover positioning
    handleKonvaPopoverOpen(
      { x: event.evt.clientX, y: event.evt.clientY },
      content
    );
  };

  return (
    <Group
      id={node.id}
      x={node.position.x}
      y={node.position.y}
    >
      {/* Equipment icon */}
      {image ?  (
        <Image
          image={image}
          width={node.size.width}
          height={node.size.height}
          onClick={(e) => handleClick(e)}
        />
      ) : (
        <Rect
          width={node.size.width}
          height={node.size.height}
          fill="lightgray"
          stroke="black"
          strokeWidth={1}
          onClick={(e) => handleClick(e)}
        />
      )}

      {/* Render all text elements */}
      {node.textElements.map(textElement => {
        const textPos = getTextPosition(textElement);
        return (
          <Text
            key={textElement.id}
            x={textPos.x}
            y={textPos.y}
            text={textElement.text}
            fontSize={textElement.fontSize || 12}
            fill={textElement.color || 'black'}
            align={textElement.align}
            offsetX={textPos.offsetX}
            verticalAlign="middle"
          />
        );
      })}
    </Group>
  );
}

export default EquipmentComponent;