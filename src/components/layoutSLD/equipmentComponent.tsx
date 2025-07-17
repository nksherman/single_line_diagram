import { Group, Rect, Text, Image } from 'react-konva';
import useImage from 'use-image';

import type { DisplayNode } from './displayAdapter';


interface EquipmentComponentProps {
  node: DisplayNode;
}

function EquipmentComponent({ node }: EquipmentComponentProps) {

  const iconPath = `/icons/${node.type.toLowerCase()}.svg`;
  const [image] = useImage(iconPath);

  return (
    <Group
      id={node.id}
      x={node.position.x}
      y={node.position.y}
      width={node.size.width}
      height={node.size.height}
    >
      <Rect
        width={node.size.width}
        height={node.size.height}
        fill="lightgray"
        stroke="black"
        strokeWidth={1}
      />
      {image && (
        <Image
          image={image}
          width={node.size.width - 10}
          height={node.size.height - 10}
          x={5}
          y={5}
        />
      )}
      <Text
        text={node.label}
        fontSize={14}
        x={5}
        y={node.size.height - 20}
        width={node.size.width - 10}
        align="center"
      />
    </Group>
  );
}

export default EquipmentComponent;