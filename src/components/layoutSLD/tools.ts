// import { Line } from 'react-konva';

/**
 * 
 * layout tools for konva components
 */

// function wrapPolygon(konvaElements) {
//   // get the bounding box of all elements
//   const boundingBox = konvaElements.reduce((box, element) => {
//     const { x, y, width, height } = element.getClientRect();
//     return {
//       x: Math.min(box.x, x),
//       y: Math.min(box.y, y),
//       width: Math.max(box.x + box.width, x + width) - Math.min(box.x, x),
//       height: Math.max(box.y + box.height, y + height) - Math.min(box.y, y)
//     };
//   }, { x: Infinity, y: Infinity, width: 0, height: 0 });

//   // Create a polygon shape that wraps the bounding box, with no white space

//   const polygon = new Line({
//     points: [
//       boundingBox.x, boundingBox.y,
//       boundingBox.x + boundingBox.width, boundingBox.y,
//       boundingBox.x + boundingBox.width, boundingBox.y + boundingBox.height,
//       boundingBox.x, boundingBox.y + boundingBox.height
//     ],
//     closed: true,
//     fill: 'rgba(0, 0, 0, 0.5)',
//     stroke: 'black',
//     strokeWidth: 2
//   });

//   return polygon;
// }