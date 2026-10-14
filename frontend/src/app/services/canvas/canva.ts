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

      if (element.type === 'ai' && element.x !== undefined && element.y !== undefined) {
        const width = element.width ?? 0;
        const height = element.height ?? 0;
        const localX = x - (element.x + width / 2);
        const localY = y - (element.y + height / 2);
        const inside = element.shape === 'circle'
          ? Math.hypot(localX, localY) <= Math.min(width, height) / 2 + 8
          : element.shape === 'diamond'
            ? Math.abs(localX) / (width / 2) + Math.abs(localY) / (height / 2) <= 1.12
            : x >= element.x - 8 && x <= element.x + width + 8 &&
              y >= element.y - 8 && y <= element.y + height + 8;
        if (inside) {
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
    selected: CanvasElement | null,
    clear = true
  ): void {
    if (clear) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    for (const element of elements) {
      ctx.save();
      ctx.strokeStyle = element.color || '#000000';
      ctx.fillStyle = element.color || '#000000';
      ctx.lineWidth = element.type === 'eraser' ? 20 : 2;
      ctx.globalCompositeOperation = element.type === 'eraser'
        ? 'destination-out'
        : 'source-over';

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
      } else if (element.type === 'ai') {
        this.renderAiNode(ctx, element);
      } else if ((element.type === 'pen' || element.type === 'eraser') && element.points?.length) {
        ctx.beginPath();
        ctx.moveTo(element.points[0].x, element.points[0].y);
        for (const point of element.points.slice(1)) {
          ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();
      }
      ctx.restore();
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

  private renderAiNode(ctx: CanvasRenderingContext2D, element: CanvasElement): void {
    if (
      element.x === undefined ||
      element.y === undefined ||
      !element.width ||
      !element.height
    ) {
      return;
    }

    ctx.beginPath();
    switch (element.shape) {
      case 'circle':
        ctx.arc(
          element.x + element.width / 2,
          element.y + element.height / 2,
          Math.min(element.width, element.height) / 2,
          0,
          Math.PI * 2
        );
        break;
      case 'diamond':
        ctx.moveTo(element.x + element.width / 2, element.y);
        ctx.lineTo(element.x + element.width, element.y + element.height / 2);
        ctx.lineTo(element.x + element.width / 2, element.y + element.height);
        ctx.lineTo(element.x, element.y + element.height / 2);
        ctx.closePath();
        break;
      case 'terminator':
        ctx.roundRect(element.x, element.y, element.width, element.height, element.height / 2);
        break;
      case 'rectangle':
        ctx.roundRect(element.x, element.y, element.width, element.height, 6);
        break;
      default:
        return;
    }
    ctx.fillStyle = '#f6f1ff';
    ctx.strokeStyle = element.color || '#7955d9';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#3b3440';
    ctx.font = '600 13px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxTextWidth = element.width - 24;
    const lines = this.wrapText(ctx, element.text || '', maxTextWidth);
    const maxLines = Math.max(1, Math.floor((element.height - 20) / 16));
    if (lines.length > maxLines) {
      lines.length = maxLines;
      lines[maxLines - 1] = this.truncateText(ctx, lines[maxLines - 1], maxTextWidth);
    }
    const startY = element.y + element.height / 2 - ((lines.length - 1) * 16) / 2;
    lines.forEach((line, index) =>
      ctx.fillText(line, element.x! + element.width! / 2, startY + index * 16)
    );
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    if (!words.length) {
      return [''];
    }

    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth) {
        line = next;
        continue;
      }
      if (line) {
        lines.push(line);
        line = '';
      }
      let segment = '';
      for (const character of word) {
        if (segment && ctx.measureText(segment + character).width > maxWidth) {
          lines.push(segment);
          segment = '';
        }
        segment += character;
      }
      line = segment;
    }
    if (line) {
      lines.push(line);
    }
    return lines.length ? lines : [''];
  }

  private truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    let truncated = text;
    while (truncated.length && ctx.measureText(`${truncated}...`).width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return `${truncated}...`;
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

    if ((element.type === 'pen' || element.type === 'eraser') && element.points?.length) {
      const x = Math.min(...element.points.map(point => point.x));
      const y = Math.min(...element.points.map(point => point.y));
      const maxX = Math.max(...element.points.map(point => point.x));
      const maxY = Math.max(...element.points.map(point => point.y));
      return { x, y, width: maxX - x, height: maxY - y };
    }

    if (
      element.type === 'ai' &&
      element.x !== undefined &&
      element.y !== undefined &&
      element.width !== undefined &&
      element.height !== undefined
    ) {
      return {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height
      };
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