import dagre from 'dagre';
import { Node, Edge, Position } from '@xyflow/react';

const NODE_WIDTH = 280;
const NODE_HEIGHT = 150;

export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    // Ideally we would use the actual node dimensions, but for now we use a fixed size
    // We can also check if node.measured exists (if using React Flow v12)
    const width = (node.measured?.width as number) || NODE_WIDTH;
    const height = (node.measured?.height as number) || NODE_HEIGHT;
    
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const width = (node.measured?.width as number) || NODE_WIDTH;
    const height = (node.measured?.height as number) || NODE_HEIGHT;
    
    const newNode = {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      // Shift anchor to top left
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
};
