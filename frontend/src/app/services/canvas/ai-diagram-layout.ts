import {
  AI_NODE_SHAPES,
  AiDiagram,
  AiDiagramEdge,
  AiDiagramLayout,
  AiDiagramNode,
  AiNodePosition
} from '../../models/ai-diagram.model';

const PADDING = 48;
const HORIZONTAL_GAP = 56;
const VERTICAL_GAP = 72;
const GRID_COLUMNS = 4;
const GRID_CELL_WIDTH = 210;
const GRID_CELL_HEIGHT = 140;
const BASE_WIDTH = 1200;
const BASE_HEIGHT = 800;

export function normalizeAiDiagram(value: unknown): AiDiagram | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as { nodes?: unknown; edges?: unknown };
  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges)) {
    return null;
  }

  const seenIds = new Set<string>();
  const nodes: AiDiagramNode[] = [];

  for (const value of candidate.nodes) {
    if (!value || typeof value !== 'object') {
      continue;
    }

    const node = value as { id?: unknown; type?: unknown; label?: unknown; shape?: unknown };
    if (typeof node.id !== 'string' || typeof node.label !== 'string') {
      continue;
    }

    const id = node.id.trim();
    const label = node.label.trim();
    if (!id || !label || seenIds.has(id)) {
      continue;
    }

    const shape = isAiNodeShape(node.shape) ? node.shape : 'rectangle';
    seenIds.add(id);
    nodes.push({
      id,
      type: typeof node.type === 'string' && node.type.trim()
        ? node.type.trim()
        : shape,
      label,
      shape
    });
  }

  if (!nodes.length) {
    return null;
  }

  const edges: AiDiagramEdge[] = [];
  for (const value of candidate.edges) {
    if (!value || typeof value !== 'object') {
      continue;
    }

    const edge = value as { source?: unknown; target?: unknown; label?: unknown };
    const source = typeof edge.source === 'string' ? edge.source.trim() : '';
    const target = typeof edge.target === 'string' ? edge.target.trim() : '';
    if (
      !source ||
      !target ||
      !seenIds.has(source) ||
      !seenIds.has(target)
    ) {
      continue;
    }

    const label = typeof edge.label === 'string' ? edge.label.trim() : '';
    edges.push({
      source,
      target,
      label
    });
  }

  return { nodes, edges };
}

function isAiNodeShape(shape: unknown): shape is AiDiagramNode['shape'] {
  return typeof shape === 'string' &&
    AI_NODE_SHAPES.includes(shape as AiDiagramNode['shape']);
}

function nodeSize(shape: AiDiagramNode['shape']): { width: number; height: number } {
  if (shape === 'circle') {
    return { width: 96, height: 96 };
  }
  if (shape === 'diamond') {
    return { width: 184, height: 104 };
  }
  if (shape === 'terminator') {
    return { width: 184, height: 76 };
  }
  return { width: 184, height: 84 };
}

function boundaryPoint(
  position: AiNodePosition,
  dx: number,
  dy: number
): { x: number; y: number } {
  const centerX = position.x + position.width / 2;
  const centerY = position.y + position.height / 2;

  if (position.width === position.height && dx === 0 && dy !== 0) {
    return { x: centerX, y: centerY + Math.sign(dy) * position.height / 2 };
  }

  if (dx === 0 && dy === 0) {
    return { x: centerX, y: position.y + position.height / 2 };
  }

  if (position.width === 96 && position.height === 96) {
    const length = Math.hypot(dx, dy);
    const radius = position.width / 2;
    return {
      x: centerX + dx / length * radius,
      y: centerY + dy / length * radius
    };
  }

  if (position.height === 104) {
    const scale = 1 / (
      Math.abs(dx) / (position.width / 2) +
      Math.abs(dy) / (position.height / 2)
    );
    return { x: centerX + dx * scale, y: centerY + dy * scale };
  }

  const scale = Math.min(
    dx === 0 ? Infinity : (position.width / 2) / Math.abs(dx),
    dy === 0 ? Infinity : (position.height / 2) / Math.abs(dy)
  );
  return { x: centerX + dx * scale, y: centerY + dy * scale };
}

export function layoutAiDiagram(
  diagram: AiDiagram,
  availableWidth = BASE_WIDTH,
  availableHeight = BASE_HEIGHT
): AiDiagramLayout {
  const positions = Object.create(null) as Record<string, AiNodePosition>;

  if (!diagram.edges.length) {
    const columns = Math.min(GRID_COLUMNS, Math.ceil(Math.sqrt(diagram.nodes.length)));
    const rows = Math.ceil(diagram.nodes.length / columns);
    const contentWidth = columns * GRID_CELL_WIDTH;
    const contentHeight = rows * GRID_CELL_HEIGHT;
    const width = Math.max(BASE_WIDTH, availableWidth, contentWidth + PADDING * 2);
    const height = Math.max(BASE_HEIGHT, availableHeight, contentHeight + PADDING * 2);
    const startX = (width - contentWidth) / 2;
    const startY = (height - contentHeight) / 2;

    diagram.nodes.forEach((node, index) => {
      const size = nodeSize(node.shape);
      const column = index % columns;
      const row = Math.floor(index / columns);
      positions[node.id] = {
        ...size,
        x: startX + column * GRID_CELL_WIDTH + (GRID_CELL_WIDTH - size.width) / 2,
        y: startY + row * GRID_CELL_HEIGHT + (GRID_CELL_HEIGHT - size.height) / 2
      };
    });

    return { width, height, positions, edges: [] };
  }

  const nodeIds = diagram.nodes.map(node => node.id);
  const outgoing = new Map(nodeIds.map(id => [id, [] as string[]]));
  const incoming = new Map(nodeIds.map(id => [id, [] as string[]]));
  for (const edge of diagram.edges) {
    outgoing.get(edge.source)?.push(edge.target);
    incoming.get(edge.target)?.push(edge.source);
  }

  const levels = new Map(nodeIds.map(id => [id, -1]));
  const queue: string[] = [];
  for (const id of nodeIds) {
    if (!incoming.get(id)?.length) {
      levels.set(id, 0);
      queue.push(id);
    }
  }

  const assignReachableLevels = (): void => {
    for (let index = 0; index < queue.length; index++) {
      const source = queue[index];
      const nextLevel = (levels.get(source) ?? 0) + 1;
      for (const target of outgoing.get(source) ?? []) {
        if (levels.get(target) === -1) {
          levels.set(target, nextLevel);
          queue.push(target);
        }
      }
    }
  };

  assignReachableLevels();
  for (const id of nodeIds) {
    if (levels.get(id) === -1) {
      levels.set(id, 0);
      queue.push(id);
      assignReachableLevels();
    }
  }

  let highestLevel = 0;
  for (const level of levels.values()) {
    highestLevel = Math.max(highestLevel, level);
  }
  const layers: AiDiagramNode[][] = Array.from({ length: highestLevel + 1 }, () => []);
  for (const node of diagram.nodes) {
    layers[levels.get(node.id) ?? 0].push(node);
  }

  const originalOrder = new Map(nodeIds.map((id, index) => [id, index]));
  const branchOrder = new Map<string, number>();
  for (const edge of diagram.edges) {
    const normalizedLabel = edge.label.toLowerCase();
    const priority = normalizedLabel === 'yes' ? 0 : normalizedLabel === 'no' ? 1 : 2;
    if (priority < (branchOrder.get(edge.target) ?? 2)) {
      branchOrder.set(edge.target, priority);
    }
  }
  const barycenter = (id: string, previousLayerOrder: Map<string, number>): number => {
    const parents = (incoming.get(id) ?? [])
      .map(parent => previousLayerOrder.get(parent))
      .filter((index): index is number => index !== undefined);
    if (!parents.length) {
      return originalOrder.get(id) ?? 0;
    }
    return parents.reduce((sum, index) => sum + index, 0) / parents.length;
  };
  for (let level = 1; level < layers.length; level++) {
    const previousLayerOrder = new Map(layers[level - 1].map((node, index) => [node.id, index]));
    layers[level].sort((left, right) =>
      barycenter(left.id, previousLayerOrder) - barycenter(right.id, previousLayerOrder) ||
      (branchOrder.get(left.id) ?? 2) - (branchOrder.get(right.id) ?? 2) ||
      (originalOrder.get(left.id) ?? 0) - (originalOrder.get(right.id) ?? 0)
    );
  }

  const layerHeights = layers.map(layer => {
    let height = 0;
    for (const node of layer) {
      height = Math.max(height, nodeSize(node.shape).height);
    }
    return height;
  });
  let maxLayerWidth = 0;
  for (const layer of layers) {
    const layerWidth = layer.reduce((width, node) =>
      width + nodeSize(node.shape).width, 0
    ) + Math.max(0, layer.length - 1) * HORIZONTAL_GAP;
    maxLayerWidth = Math.max(maxLayerWidth, layerWidth);
  }

  const routedEdges = diagram.edges.filter(edge =>
    (levels.get(edge.target) ?? 0) !== (levels.get(edge.source) ?? 0) + 1
  );
  const routingGutter = routedEdges.length ? PADDING + routedEdges.length * 18 : PADDING;
  const width = Math.max(
    BASE_WIDTH,
    availableWidth,
    maxLayerWidth + PADDING * 2 + routingGutter
  );
  const contentWidth = width - PADDING * 2 - routingGutter;

  let y = PADDING;
  layers.forEach((layer, level) => {
    const layerWidth = layer.reduce((total, node) => total + nodeSize(node.shape).width, 0) +
      Math.max(0, layer.length - 1) * HORIZONTAL_GAP;
    let x = PADDING + (contentWidth - layerWidth) / 2;
    const rowHeight = layerHeights[level];
    for (const node of layer) {
      const size = nodeSize(node.shape);
      positions[node.id] = {
        ...size,
        x,
        y: y + (rowHeight - size.height) / 2
      };
      x += size.width + HORIZONTAL_GAP;
    }
    y += rowHeight + VERTICAL_GAP;
  });

  const height = Math.max(BASE_HEIGHT, availableHeight, y - VERTICAL_GAP + PADDING);
  const edgeLayouts: AiDiagramLayout['edges'] = [];
  let routedEdgeIndex = 0;
  for (const edge of diagram.edges) {
    const source = positions[edge.source];
    const target = positions[edge.target];
    if (!source || !target) {
      continue;
    }

    const sourceLevel = levels.get(edge.source) ?? 0;
    const targetLevel = levels.get(edge.target) ?? 0;
    if (targetLevel === sourceLevel + 1) {
      const start = boundaryPoint(source, 0, 1);
      const end = boundaryPoint(target, 0, -1);
      const midY = (start.y + end.y) / 2;
      edgeLayouts.push({
        edge,
        points: [
          start,
          { x: start.x, y: midY },
          { x: end.x, y: midY },
          end
        ],
        labelX: (start.x + end.x) / 2,
        labelY: midY
      });
      continue;
    }

    const laneX = width - PADDING - 18 * routedEdgeIndex++;
    const start = boundaryPoint(source, 1, 0);
    const end = boundaryPoint(target, 1, 0);
    const isSelfEdge = edge.source === edge.target;
    const sourceY = isSelfEdge ? source.y + source.height * 0.3 : start.y;
    const targetY = isSelfEdge ? source.y - 12 : end.y;
    edgeLayouts.push({
      edge,
      points: [
        { x: start.x, y: sourceY },
        { x: laneX, y: sourceY },
        { x: laneX, y: targetY },
        isSelfEdge
          ? boundaryPoint(target, 0, -1)
          : { x: end.x, y: targetY }
      ],
      labelX: laneX,
      labelY: (sourceY + targetY) / 2
    });
  }

  return { width, height, positions, edges: edgeLayouts };
}
