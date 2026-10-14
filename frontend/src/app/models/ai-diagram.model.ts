export const AI_NODE_SHAPES = [
  'circle',
  'rectangle',
  'diamond',
  'terminator'
] as const;

export type AiNodeShape = typeof AI_NODE_SHAPES[number];

export interface AiDiagramNode {
  id: string;
  type: string;
  label: string;
  shape: AiNodeShape;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface AiDiagramEdge {
  source: string;
  target: string;
  label: string;
}

export interface AiDiagram {
  diagramId?: string;
  nodes: AiDiagramNode[];
  edges: AiDiagramEdge[];
}

export interface AiNodePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: AiNodeShape;
}

export interface AiDiagramLayout {
  width: number;
  height: number;
  positions: Record<string, AiNodePosition>;
  edges: Array<{
    edge: AiDiagramEdge;
    points: Array<{ x: number; y: number }>;
    labelX: number;
    labelY: number;
  }>;
}
