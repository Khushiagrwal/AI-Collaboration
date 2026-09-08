import { Injectable, signal } from '@angular/core';
import { CanvasElement } from '../../models/canvas-element.model';

@Injectable({
  providedIn: 'root'
})
export class Canva {

  private elements = signal<CanvasElement[]>([]);

  getElements() {
    return this.elements();
  }

  setElements(elements: CanvasElement[]) {
    this.elements.set(elements);
  }

  addElement(element: CanvasElement) {
    this.elements.update(elements => [
      ...elements,
      element
    ]);
  }

  clear() {
    this.elements.set([]);
  }

  findElementAt(
    ctx: CanvasRenderingContext2D,
    elements: CanvasElement[],
    x: number,
    y: number
  ): CanvasElement | null {
    for (let index = elements.length - 1; index >= 0; index--) {
      const element = elements[index];

      if (element.type === 'line' || element.type === 'circle') {
        const minX = Math.min(element.startX!, element.endX!);
        const maxX = Math.max(element.startX!, element.endX!);
        const minY = Math.min(element.startY!, element.endY!);
        const maxY = Math.max(element.startY!, element.endY!);

        if (
          x >= minX - 10 &&
          x <= maxX + 10 &&
          y >= minY - 10 &&
          y <= maxY + 10
        ) {
          return element;
        }
      }

      if (element.type === 'text') {
        ctx.font = '20px Arial';
        const width = ctx.measureText(element.text || '').width;

        if (
          x >= element.x! - 10 &&
          x <= element.x! + width + 10 &&
          y >= element.y! - 35 &&
          y <= element.y! + 10
        ) {
          return element;
        }
      }

      if (element.type === 'pen' && element.points?.length) {
        const hit = element.points.some((point, pointIndex, points) => {
          const nextPoint = points[pointIndex + 1];
          if (!nextPoint) {
            return Math.hypot(x - point.x, y - point.y) <= 10;
          }

          const lineX = nextPoint.x - point.x;
          const lineY = nextPoint.y - point.y;
          const lengthSquared = lineX ** 2 + lineY ** 2;
          const position = lengthSquared === 0
            ? 0
            : Math.max(0, Math.min(1, ((x - point.x) * lineX + (y - point.y) * lineY) / lengthSquared));
          const closestX = point.x + position * lineX;
          const closestY = point.y + position * lineY;

          return Math.hypot(x - closestX, y - closestY) <= 10;
        });

        if (hit) {
          return element;
        }
      }
    }

    return null;
  }

  render(
    ctx: CanvasRenderingContext2D,
    elements: CanvasElement[],
    selected: CanvasElement | null
  ): void {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (const element of elements) {
      ctx.strokeStyle = element.color || '#000000';
      ctx.fillStyle = element.color || '#000000';
      ctx.lineWidth = 2;
      ctx.globalCompositeOperation = 'source-over';

      if (element.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(element.startX!, element.startY!);
        ctx.lineTo(element.endX!, element.endY!);
        ctx.stroke();
      } else if (element.type === 'circle') {
        const radiusX = element.endX! - element.startX!;
        const radiusY = element.endY! - element.startY!;
        ctx.beginPath();
        ctx.ellipse(
          element.startX! + radiusX / 2,
          element.startY! + radiusY / 2,
          Math.abs(radiusX / 2),
          Math.abs(radiusY / 2),
          0,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      } else if (element.type === 'text') {
        ctx.font = '20px Arial';
        ctx.fillText(element.text || '', element.x!, element.y!);
      } else if (element.type === 'pen' && element.points?.length) {
        ctx.beginPath();
        ctx.moveTo(element.points[0].x, element.points[0].y);
        for (const point of element.points.slice(1)) {
          ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();
      }
    }

    if (!selected) {
      return;
    }

    const bounds = this.getBounds(ctx, selected);
    if (!bounds) {
      return;
    }

    ctx.save();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10);
    ctx.restore();
  }

  private getBounds(
    ctx: CanvasRenderingContext2D,
    element: CanvasElement
  ): { x: number; y: number; width: number; height: number } | null {
    if (element.type === 'text') {
      ctx.font = '20px Arial';
      return {
        x: element.x!,
        y: element.y! - 20,
        width: ctx.measureText(element.text || '').width,
        height: 25
      };
    }

    if (element.type === 'pen' && element.points?.length) {
      const x = Math.min(...element.points.map(point => point.x));
      const y = Math.min(...element.points.map(point => point.y));
      const maxX = Math.max(...element.points.map(point => point.x));
      const maxY = Math.max(...element.points.map(point => point.y));
      return { x, y, width: maxX - x, height: maxY - y };
    }

    if (
      element.startX === undefined ||
      element.startY === undefined ||
      element.endX === undefined ||
      element.endY === undefined
    ) {
      return null;
    }

    const x = Math.min(element.startX, element.endX);
    const y = Math.min(element.startY, element.endY);
    return {
      x,
      y,
      width: Math.max(element.startX, element.endX) - x,
      height: Math.max(element.startY, element.endY) - y
    };
  }
}