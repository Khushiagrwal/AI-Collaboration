import { TestBed } from '@angular/core/testing';

import { Canva } from './canva';

describe('Canva', () => {
  let service: Canva;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Canva);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('hit-tests structured AI nodes so they can be selected and dragged', () => {
    const node = {
      id: 'ai:diagram-1:node-1',
      type: 'ai' as const,
      x: 40,
      y: 50,
      width: 100,
      height: 100,
      shape: 'circle' as const,
      text: 'Start',
      data: { diagramId: 'diagram-1', nodeId: 'node-1' }
    };

    expect(service.findElementAt(
      {} as CanvasRenderingContext2D,
      [node],
      90,
      100
    )).toBe(node);
    expect(service.findElementAt(
      {} as CanvasRenderingContext2D,
      [node],
      40,
      50
    )).toBeNull();
  });
});
