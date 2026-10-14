import { describe, expect, it } from 'vitest';
import { AiDiagram } from '../../models/ai-diagram.model';
import { layoutAiDiagram, normalizeAiDiagram } from './ai-diagram-layout';

describe('AI diagram layout', () => {
  it('normalizes supported shapes and drops malformed nodes and edge references', () => {
    const diagram = normalizeAiDiagram({
      nodes: [
        { id: 'start', type: 'flow', label: 'Start', shape: 'terminator' },
        { id: 'decision', type: 'decision', label: 'Continue?', shape: 'unknown-shape' },
        { id: 'decision', label: 'Duplicate', shape: 'circle' },
        { id: '', label: 'Invalid', shape: 'circle' }
      ],
      edges: [
        { source: 'start', target: 'decision', label: 'Yes' },
        { source: 'start', target: 'missing', label: 'No' },
        { source: 7, target: 'decision' }
      ]
    });

    expect(diagram).toEqual({
      nodes: [
        { id: 'start', type: 'flow', label: 'Start', shape: 'terminator' },
        { id: 'decision', type: 'decision', label: 'Continue?', shape: 'rectangle' }
      ],
      edges: [{ source: 'start', target: 'decision', label: 'Yes' }]
    });
  });

  it('places disconnected diagrams in a non-overlapping grid', () => {
    const diagram: AiDiagram = {
      nodes: Array.from({ length: 13 }, (_, index) => ({
        id: `node-${index}`,
        type: 'node',
        label: `Node ${index}`,
        shape: index % 2 ? 'circle' : 'rectangle'
      })),
      edges: []
    };
    const layout = layoutAiDiagram(diagram, 500, 300);

    expect(layout.width).toBeGreaterThanOrEqual(500);
    expect(layout.height).toBeGreaterThan(300);
    expect(new Set(Object.values(layout.positions).map(({ x, y }) => `${x}:${y}`)).size).toBe(13);

    const positions = Object.values(layout.positions);
    for (let first = 0; first < positions.length; first++) {
      for (let second = first + 1; second < positions.length; second++) {
        const a = positions[first];
        const b = positions[second];
        const overlap = a.x < b.x + b.width && a.x + a.width > b.x &&
          a.y < b.y + b.height && a.y + a.height > b.y;
        expect(overlap).toBe(false);
      }
    }
  });

  it('keeps cyclic and long graphs finite, unique, and routed through an expanded layout', () => {
    const nodes = Array.from({ length: 40 }, (_, index) => ({
      id: `node-${index}`,
      type: 'node',
      label: `Node ${index}`,
      shape: 'rectangle' as const
    }));
    const edges = nodes.slice(0, -1).map((node, index) => ({
      source: node.id,
      target: nodes[index + 1].id,
      label: ''
    }));
    edges.push({ source: 'node-39', target: 'node-0', label: '' });
    const layout = layoutAiDiagram({ nodes, edges }, 320, 240);

    expect(layout.width).toBeGreaterThan(320);
    expect(layout.height).toBeGreaterThan(240);
    expect(Object.keys(layout.positions)).toHaveLength(nodes.length);
    expect(new Set(Object.values(layout.positions).map(({ x, y }) => `${x}:${y}`)).size)
      .toBe(nodes.length);
    expect(layout.edges).toHaveLength(edges.length);
    expect(layout.edges.flatMap(edge => edge.points).every(point =>
      Number.isFinite(point.x) && Number.isFinite(point.y) &&
      point.x >= 0 && point.x <= layout.width &&
      point.y >= 0 && point.y <= layout.height
    )).toBe(true);
  });

  it('separates Yes and No decision branches where space permits', () => {
    const diagram: AiDiagram = {
      nodes: [
        { id: 'decision', type: 'decision', label: 'Continue?', shape: 'diamond' },
        { id: 'no', type: 'flow', label: 'Stop', shape: 'terminator' },
        { id: 'yes', type: 'flow', label: 'Next step', shape: 'rectangle' }
      ],
      edges: [
        { source: 'decision', target: 'no', label: 'No' },
        { source: 'decision', target: 'yes', label: 'Yes' }
      ]
    };
    const layout = layoutAiDiagram(diagram);

    expect(layout.positions['yes'].x).toBeLessThan(layout.positions['no'].x);
    expect(layout.edges.every(edge => edge.edge.label)).toBe(true);
  });
});
