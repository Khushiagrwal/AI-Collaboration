export interface CanvasElement {
  id: string;

  type: 'pen' | 'eraser' | 'line' | 'circle' | 'text' | 'ai';

  color?: string;

  points?: {
    x: number;
    y: number;
  }[];

  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;

  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  shape?: 'circle' | 'rectangle' | 'diamond' | 'terminator';

  data?: {
    diagramId: string;
    nodeId: string;
  };
}