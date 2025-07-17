import { Group, Rect, Text, Image } from 'react-konva';
import useImage from 'use-image';

import type { DisplayNode, TextElement } from './displayAdapter';

interface EquipmentComponentProps {
  node: DisplayNode;
}

function EquipmentComponent({ node }: EquipmentComponentProps) {
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

  return (
    <Group
      id={node.id}
      x={node.position.x}
      y={node.position.y}
    >
      {/* Background rectangle */}
      <Rect
        width={node.size.width}
        height={node.size.height}
        fill="white"
        stroke="black"
        strokeWidth={1}
      />
      
      {/* Equipment icon */}
      {image && (
        <Image
          image={image}
          width={node.size.width - 4}
          height={node.size.height - 4}
          x={2}
          y={2}
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