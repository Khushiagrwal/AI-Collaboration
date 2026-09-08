import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild
} from '@angular/core';

import {
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';

import { Canva } from '../../services/canvas/canva';
import { ActivatedRoute } from '@angular/router';
import { BoardService } from '../../services/boardService/boardService';
import { SocketService } from '../../services/SocketService/socketService';
import { InvitationService } from '../../services/invitation/invite';
import { NotificationService } from '../../services/notification.service';
import { AiPanalModal } from '../../components/ai-panel/ai-panal-modal/ai-panal-modal';
import { CanvasElement } from '../../models/canvas-element.model';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    AiPanalModal
  ],
  templateUrl: './board.html',
  styleUrl: './board.css',
})
export class Board implements OnInit, AfterViewInit {

  private route = inject(ActivatedRoute);
  private boardService = inject(BoardService);
  private socketService = inject(SocketService);
  private invitationService = inject(InvitationService);
  private notifications = inject(NotificationService);
  private canvaService = inject(Canva);

  board = signal<any>(null);
  currentUser = signal<any>(null);
  isOwner = signal(false);
  canvasElements = signal<any[]>([]);
  aiDiagrams = signal<any[]>([]);
  activeTool:
    | 'select'
    | 'hand'
    | 'pen'
    | 'eraser'
    | 'circle'
    | 'line'
    | 'text' = 'select';

  color = '#7c3aed';
  showColorPicker = false;
  readonly colorPresets = [
    '#111827',
    '#ef4444',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#06b6d4',
    '#3b82f6',
    '#7c3aed',
    '#ec4899'
  ];
  isDrawing = false;
  private startX = 0;
  private startY = 0;
  private snapshot!: ImageData;
  isTyping = false;
  currentText = '';
  textX = 0;
  textY = 0;
  showShareModal = false;
  participantEmail = '';
  inviteRole: 'viewer' | 'editor' = 'editor';
  invitationLink = '';
  inviteStatus = '';
  inviteError = '';
  linkCopied = false;
  private remoteLastX: number | null = null;
  private remoteLastY: number | null = null;
  private currentX = 0;
  private currentY = 0;
  remoteCursors = signal<Record<string, any>>({});
  private lastCursorSent = 0;
  showAiModal = false;
  selectedElement = signal<CanvasElement | null>(null);
  isDragging = false;

  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private activePenElement: CanvasElement | null = null;

  get remoteCursorEntries() {
    return Object.entries(this.remoteCursors());
  }

  selectColor(color: string): void {
    this.color = color;
    this.showColorPicker = false;
  }

  toggleColorPicker(): void {
    this.showColorPicker = !this.showColorPicker;
  }

  @ViewChild('boardCanvas')
  canvas!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  ngOnInit(): void {

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadBoard(id);
      this.socketService.joinBoard(id)
    }
    this.socketService.onDraw((data) => {
      // console.log('Remote draw received:', data);
      this.drawRemote(data);
    })

    this.socketService.onDrawStart((data) => {
      this.remoteLastX = data.x;
      this.remoteLastY = data.y;
    });

    this.socketService.onDrawEnd(() => {
      this.remoteLastX = null;
      this.remoteLastY = null;
    });

    this.socketService.onDrawShape((data) => {
      this.drawRemoteShape(data);
    });

    this.socketService.onClearBoard(() => {
      this.ctx.clearRect(
        0,
        0,
        this.canvas.nativeElement.width,
        this.canvas.nativeElement.height
      );
    });

    this.socketService.onCursorMove((data) => {
      this.remoteCursors.update(cursors => ({
        ...cursors,
        [data.socketId]: data
      }));
    });

    this.socketService.onCursorLeave((data) => {
      this.remoteCursors.update(cursors => {
        const updated = { ...cursors };
        delete updated[data.socketId];
        return updated;
      });
    });

    this.socketService.onAiDiagram((diagram) => {
      console.log('AI diagram received:', diagram);
      this.drawAiDiagram(diagram);
    });



  }

  ngAfterViewInit(): void {

    const canvas = this.canvas.nativeElement;
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.max(600, rect.width);
    canvas.height = Math.max(400, rect.height);

    this.ctx = canvas.getContext('2d')!;

    // Default canvas settings
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = this.color;
    this.ctx.lineWidth = 2;
  }

  private drawRemoteShape(data: any): void {

    if (data.tool === 'line') {

      this.ctx.save();

      this.ctx.globalCompositeOperation = 'source-over';

      this.ctx.strokeStyle = data.color;
      this.ctx.lineWidth = 2;
      this.ctx.lineCap = 'round';

      this.ctx.beginPath();

      this.ctx.moveTo(
        data.startX,
        data.startY
      );

      this.ctx.lineTo(
        data.endX,
        data.endY
      );

      this.ctx.stroke();
    }
    if (data.tool === 'circle') {

      const radiusX = data.endX - data.startX;
      const radiusY = data.endY - data.startY;

      const centerX =
        data.startX + radiusX / 2;

      const centerY =
        data.startY + radiusY / 2;

      this.ctx.beginPath();

      this.ctx.ellipse(
        centerX,
        centerY,
        Math.abs(radiusX / 2),
        Math.abs(radiusY / 2),
        0,
        0,
        Math.PI * 2
      );

      this.ctx.stroke();
    }
    if (data.tool === 'text') {

      this.ctx.font = '12px Arial';
      this.ctx.fillStyle = data.color;

      this.ctx.fillText(
        data.text,
        data.x,
        data.y + 20
      );
    }
    this.ctx.restore();

  }

  private drawRemote(data: any): void {

    if (this.remoteLastX === null || this.remoteLastY === null) {
      this.remoteLastX = data.x;
      this.remoteLastY = data.y;
      return;
    }

    this.ctx.save();

    if (data.tool === 'eraser') {

      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.lineWidth = 20;

    } else {

      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = data.color;
      this.ctx.lineWidth = 2;
    }

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();

    this.ctx.moveTo(
      this.remoteLastX,
      this.remoteLastY
    );

    this.ctx.lineTo(
      data.x,
      data.y
    );

    this.ctx.stroke();

    this.ctx.restore();

    this.remoteLastX = data.x;
    this.remoteLastY = data.y;
  }

  private getMousePosition(event: MouseEvent) {

    const canvas = this.canvas.nativeElement;

    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }
  private findElementAt(x: number, y: number): CanvasElement | null {
    return this.canvaService.findElementAt(this.ctx, this.canvasElements(), x, y);
  }
  private renderCanvas(): void {
    this.canvaService.render(
      this.ctx,
      this.canvasElements(),
      this.selectedElement()
    );
  }
  private addText(event: MouseEvent): void {

    const canvas = this.canvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    this.textX = event.clientX - rect.left;
    this.textY = event.clientY - rect.top;
    this.currentText = '';
    this.isTyping = true;
  }

  finishText(): void {

    if (!this.currentText.trim()) {

      this.cancelText();

      return;
    }

    const canvas = this.canvas.nativeElement;

    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = this.textX * scaleX;
    const canvasY = this.textY * scaleY;

    this.ctx.globalCompositeOperation = 'source-over';

    this.ctx.font = '20px Arial';
    this.ctx.fillStyle = this.color;

    this.ctx.fillText(
      this.currentText,
      canvasX,
      canvasY
    );
    this.canvasElements.update(elements => [
      ...elements,
      {
        id: crypto.randomUUID(),
        type: 'text',
        x: canvasX,
        y: canvasY,
        text: this.currentText,
        color: this.color
      }
    ]);
    this.socketService.drawShape({
      boardId: this.board()?._id,
      tool: 'text',
      x: canvasX,
      y: canvasY,
      text: this.currentText,
      color: this.color
    });
    this.currentText = '';

    this.isTyping = false;
  }

  cancelText(): void {

    this.currentText = '';

    this.isTyping = false;
  }

  loadBoard(id: string): void {

    this.boardService.getBoard(id).subscribe({

      next: (res: any) => {

        this.board.set(res.board);
        this.currentUser.set(res.currentUser);
        this.isOwner.set(res.isOwner === true);

        const data = res.board?.canvasData;

        if (!data) {
          return;
        }

        const drawSavedCanvas = () => {

          const image = new Image();

          image.onload = () => {

            this.ctx.clearRect(
              0,
              0,
              this.canvas.nativeElement.width,
              this.canvas.nativeElement.height
            );

            this.ctx.drawImage(
              image,
              0,
              0,
              this.canvas.nativeElement.width,
              this.canvas.nativeElement.height
            );
          };

          image.src = data;
        };

        if (this.ctx) {

          drawSavedCanvas();

        } else {

          setTimeout(() => {

            if (this.ctx) {
              drawSavedCanvas();
            }

          }, 0);
        }
      },
      error: (err) => {
        this.notifications.error(err.error?.message || 'Could not load this board');
      }

    });
  }

  startDrawing(event: MouseEvent): void {

    const { x, y } = this.getMousePosition(event);

    this.startX = x;
    this.startY = y;

    if (this.activeTool === 'select') {

      const element = this.findElementAt(x, y);

      if (element) {

        this.selectedElement.set(element);
        this.isDragging = true;
        this.isDrawing = true;

        if (element.type === 'line' || element.type === 'circle') {
          this.dragOffsetX = x - element.startX!;
          this.dragOffsetY = y - element.startY!;
        } else if (element.type === 'text') {

          this.dragOffsetX = x - element.x!;
          this.dragOffsetY = y - element.y!;
        } else if (element.type === 'pen' && element.points?.length) {
          const minX = Math.min(...element.points.map(point => point.x));
          const minY = Math.min(...element.points.map(point => point.y));
          this.dragOffsetX = x - minX;
          this.dragOffsetY = y - minY;
        }
        this.renderCanvas();
        console.log('Selected:', element);

      } else {

        this.selectedElement.set(null);
        this.isDragging = false;
        this.isDrawing = false;
        this.renderCanvas();
      }

      return;
    }

    if (this.activeTool === 'hand') {

      return;
    }

    if (this.activeTool === 'text') {

      this.addText(event);

      return;
    }

    this.isDrawing = true;


    // Save current canvas
    this.snapshot = this.ctx.getImageData(
      0,
      0,
      this.canvas.nativeElement.width,
      this.canvas.nativeElement.height
    );

    if (this.activeTool === 'pen') {

      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.strokeStyle = this.color;
      this.ctx.lineWidth = 2;
      this.ctx.lineCap = 'round';

      this.activePenElement = {
        id: crypto.randomUUID(),
        type: 'pen',
        points: [{ x, y }],
        color: this.color
      };
      this.canvasElements.update(elements => [
        ...elements,
        this.activePenElement!
      ]);

      this.socketService.drawStart({
        boardId: this.board()?._id,
        tool: 'pen',
        x,
        y,
        color: this.color
      });

      return;
    }

    if (this.activeTool === 'eraser') {

      this.ctx.globalCompositeOperation =
        'destination-out';
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineWidth = 20;
      this.ctx.lineCap = 'round';
      this.socketService.drawStart({
        boardId: this.board()?._id,
        tool: 'eraser',
        x,
        y
      });

      return;
    }

    if (this.activeTool === 'line') {

      this.ctx.globalCompositeOperation =
        'source-over';

      this.ctx.strokeStyle = this.color;

      this.ctx.lineWidth = 2;

      return;
    }

    if (this.activeTool === 'circle') {

      this.ctx.globalCompositeOperation =
        'source-over';

      this.ctx.strokeStyle = this.color;

      this.ctx.lineWidth = 2;

      return;
    }
  }

  draw(event: MouseEvent): void {

    if (!this.isDrawing) {
      return;
    }

    const { x, y } = this.getMousePosition(event);
    this.currentX = x;
    this.currentY = y;
    if (this.activeTool === 'select') {

      if (!this.isDragging) {
        return;
      }

      const element = this.selectedElement();

      if (!element) {
        return;
      }

      // TEXT
      if (element.type === 'text') {

        const newX = x - this.dragOffsetX;
        const newY = y - this.dragOffsetY;

        const movedElement = {
          ...element,
          x: newX,
          y: newY
        };

        this.selectedElement.set(movedElement);

        this.canvasElements.update(elements =>
          elements.map(item =>
            item.id === element.id ? movedElement : item
          )
        );

        this.renderCanvas();

        return;
      }

      if (element.type === 'pen' && element.points?.length) {
        const minX = Math.min(...element.points.map(point => point.x));
        const minY = Math.min(...element.points.map(point => point.y));
        const deltaX = x - this.dragOffsetX - minX;
        const deltaY = y - this.dragOffsetY - minY;
        const movedElement = {
          ...element,
          points: element.points.map(point => ({
            x: point.x + deltaX,
            y: point.y + deltaY
          }))
        };

        this.selectedElement.set(movedElement);
        this.canvasElements.update(elements =>
          elements.map(item => item.id === element.id ? movedElement : item)
        );
        this.renderCanvas();
        return;
      }

      // LINE / CIRCLE
      if (
        element.type === 'line' ||
        element.type === 'circle'
      ) {

        if (
          element.startX === undefined ||
          element.startY === undefined
        ) {
          return;
        }

        const newStartX = x - this.dragOffsetX;
        const newStartY = y - this.dragOffsetY;

        const width =
          (element.endX ?? element.startX) - element.startX;

        const height =
          (element.endY ?? element.startY) - element.startY;

        const movedElement = {
          ...element,
          startX: newStartX,
          startY: newStartY,
          endX: newStartX + width,
          endY: newStartY + height
        };

        this.selectedElement.set(movedElement);

        this.canvasElements.update(elements =>
          elements.map(item =>
            item.id === element.id ? movedElement : item
          )
        );

        this.renderCanvas();

        return;
      }

      return;
    }

    if (!this.isDrawing) {
      return;
    }
    this.currentX = x;
    this.currentY = y;

    if (this.activeTool === 'pen') {

      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      this.activePenElement?.points?.push({ x, y });

      this.socketService.draw({
        boardId: this.board()?._id,
        tool: 'pen',
        x: x,
        y: y,
        color: this.color
      });

      return;
    }

    if (this.activeTool === 'eraser') {

      this.ctx.lineTo(x, y);

      this.ctx.stroke();
      this.socketService.draw({
        boardId: this.board()?._id,
        tool: 'eraser',
        x,
        y
      });
      return;
    }

    if (this.activeTool === 'line') {

      // Restore previous canvas
      this.ctx.putImageData(
        this.snapshot,
        0,
        0
      );
      this.ctx.beginPath();

      this.ctx.moveTo(
        this.startX,
        this.startY
      );
      this.ctx.lineTo(
        x,
        y
      );
      this.ctx.strokeStyle = this.color;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      return;
    }

    if (this.activeTool === 'circle') {

      // Restore previous canvas
      this.ctx.putImageData(
        this.snapshot,
        0,
        0
      );

      const radiusX = x - this.startX;

      const radiusY = y - this.startY;

      const centerX =
        this.startX + radiusX / 2;

      const centerY =
        this.startY + radiusY / 2;


      this.ctx.beginPath();

      this.ctx.ellipse(
        centerX,
        centerY,
        Math.abs(radiusX / 2),
        Math.abs(radiusY / 2),
        0,
        0,
        Math.PI * 2
      );

      this.ctx.strokeStyle = this.color;

      this.ctx.lineWidth = 2;

      this.ctx.stroke();

      return;
    }


  }

  trackCursor(event: MouseEvent): void {
    const now = Date.now();
    if (now - this.lastCursorSent < 40) {
      return;
    }

    const canvas = this.canvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    this.lastCursorSent = now;

    this.socketService.updateCursor({
      boardId: this.board()?._id,
      name: this.currentUser()?.name || 'Collaborator',
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100
    });
  }

  stopTrackingCursor(): void {
    const boardId = this.board()?._id;
    if (boardId) {
      this.socketService.leaveCursor(boardId);
    }
  }

  stopDrawing(): void {
    if (this.activeTool === 'select') {

      this.isDragging = false;
      this.isDrawing = false;

      return;
    }

    if (!this.isDrawing) {
      return;
    }

    this.isDrawing = false;

    if (this.activeTool === 'line') {

      this.socketService.drawShape({
        boardId: this.board()?._id,
        tool: 'line',
        startX: this.startX,
        startY: this.startY,
        endX: this.currentX,
        endY: this.currentY,
        color: this.color
      });

      this.canvasElements.update(elements => [
        ...elements,
        {
          id: crypto.randomUUID(),
          type: 'line',
          startX: this.startX,
          startY: this.startY,
          endX: this.currentX,
          endY: this.currentY,
          color: this.color
        }
      ]);

    } else if (
      this.activeTool === 'pen' ||
      this.activeTool === 'eraser'
    ) {

      this.socketService.drawEnd({
        boardId: this.board()?._id,
        tool: this.activeTool
      });
      this.activePenElement = null;
    } else if (this.activeTool === 'circle') {

      this.socketService.drawShape({
        boardId: this.board()?._id,
        tool: 'circle',
        startX: this.startX,
        startY: this.startY,
        endX: this.currentX,
        endY: this.currentY,
        color: this.color
      });

      this.canvasElements.update(elements => [
        ...elements,
        {
          id: crypto.randomUUID(),
          type: 'circle',
          startX: this.startX,
          startY: this.startY,
          endX: this.currentX,
          endY: this.currentY,
          color: this.color
        }
      ]);
    }

    this.ctx.closePath();

    this.ctx.globalCompositeOperation =
      'source-over';
  }

  clearCanvas(): void {

    const canvas = this.canvas.nativeElement;

    this.ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
    this.socketService.clearBoard(
      this.board()?._id
    );
  }

  saveBoard(): void {

    if (!this.board()?._id) {

      this.notifications.error('Board ID not found');

      return;
    }

    const canvasData =
      this.canvas.nativeElement.toDataURL(
        'image/png'
      );


    const data = {
      canvasData: canvasData
    };


    this.boardService
      .updateBoard(
        data,
        this.board()._id
      )
      .subscribe({

        next: (res) => {
          this.notifications.success('Board saved successfully');
        },

        error: (err) => {

          this.notifications.error(err.error?.message || 'Could not save board');
        }

      });
  }

  addParticipant() {
    const email = this.participantEmail.trim().toLowerCase();
    if (!email) {
      return;
    }

    const boardId = this.board()?._id;
    if (!boardId) {
      return;
    }

    this.inviteStatus = '';
    this.inviteError = '';
    this.linkCopied = false;

    this.invitationService
      .createInvitation(boardId, email, this.inviteRole)
      .subscribe({
        next: (res: any) => {
          this.invitationLink = res.invitationLink || '';
          this.inviteStatus = 'Invitation link generated';
          this.notifications.success('Invitation link generated');
          this.participantEmail = '';
        },
        error: (err) => {
          this.inviteError = err.error?.message || 'Could not create invitation';
          this.notifications.error(this.inviteError);
        }

      });
  }

  async copyInvitationLink(): Promise<void> {
    if (!this.invitationLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.invitationLink);
      this.linkCopied = true;
      this.inviteStatus = 'Link copied to clipboard';
      this.notifications.success('Invitation link copied');
    } catch {
      this.inviteError = 'Could not copy the link. Please copy it manually.';
      this.notifications.error(this.inviteError);
    }
  }

  closeShareModal(): void {
    this.showShareModal = false;
    this.inviteStatus = '';
    this.inviteError = '';
    this.linkCopied = false;
  }

  onDiagramGenerated(diagram: any): void {
    console.log('Generated diagram:', diagram);
    this.drawAiDiagram(diagram);
    this.socketService.sendAiDiagram({
      boardId: this.board()?._id,
      diagram
    });
    this.showAiModal = false;
  }

  drawAiDiagram(diagram: any): void {
    const nodes = diagram.nodes;
    const edges = diagram.edges;

    if (!nodes || !edges) {
      console.error('Invalid diagram data');
      return;
    }

    const canvas = this.canvas?.nativeElement;
    const canvasWidth = canvas ? canvas.width : 1000;
    const canvasHeight = canvas ? canvas.height : 700;

    const padding = 30;
    const nodeWidth = 200;
    const nodeHeight = 72;
    const horizontalGap = 80;
    const verticalGap = 90;

    const columns = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(nodes.length))));
    const rows = Math.ceil(nodes.length / columns);

    const maxX = Math.max(padding, canvasWidth - padding - nodeWidth);
    const maxY = Math.max(padding, canvasHeight - padding - nodeHeight);

    const positions: Record<string, { x: number; y: number }> = {};

    nodes.forEach((node: any, index: number) => {
      const column = index % columns;
      const row = Math.floor(index / columns);

      const x = Math.min(
        maxX,
        padding + column * (nodeWidth + horizontalGap)
      );

      const y = Math.min(
        maxY,
        padding + row * (nodeHeight + verticalGap)
      );

      positions[node.id] = {
        x: Math.max(padding, x),
        y: Math.max(padding, y),
      };
    });

    // Draw edges first
    edges.forEach((edge: any) => {
      const source = positions[edge.source];
      const target = positions[edge.target];

      if (!source || !target) {
        return;
      }

      this.drawAiArrow(
        source.x + nodeWidth / 2,
        source.y + nodeHeight / 2,
        target.x + nodeWidth / 2,
        target.y + nodeHeight / 2
      );
    });

    // Draw nodes
    nodes.forEach((node: any) => {
      const position = positions[node.id];

      this.drawAiNode(
        position.x,
        position.y,
        nodeWidth,
        nodeHeight,
        node.label,
        node.type
      );
    });
  }

  drawAiNode(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    type: string
  ): void {

    this.ctx.save();

    const nodeWidth = Math.min(width, Math.max(150, width));
    const nodeHeight = Math.min(height, Math.max(54, height));

    const gradient = this.ctx.createLinearGradient(x, y, x + nodeWidth, y + nodeHeight);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#f8faff');

    this.ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowOffsetY = 4;

    this.ctx.beginPath();
    this.ctx.roundRect(x, y, nodeWidth, nodeHeight, 16);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetY = 0;

    this.ctx.strokeStyle = '#7c3aed';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.fillStyle = '#7c3aed';
    this.ctx.fillRect(x + 12, y + 12, 6, nodeHeight - 24);

    const wrappedLabel = this.wrapAiText(label, nodeWidth - 34, '600 13px Arial');
    const labelLines = wrappedLabel.slice(0, 2);

    this.ctx.fillStyle = '#111827';
    this.ctx.font = '600 13px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';

    labelLines.forEach((line: string, index: number) => {
      const lineY = y + nodeHeight / 2 - (labelLines.length > 1 ? 8 : 0) + (index - (labelLines.length - 1) / 2) * 14;
      this.ctx.fillText(line, x + 26, lineY);
    });

    this.ctx.fillStyle = '#6b7280';
    this.ctx.font = '11px Arial';
    this.ctx.textAlign = 'left';

    const typeText = this.truncateText(type, nodeWidth - 38);
    this.ctx.fillText(
      typeText,
      x + 26,
      y + nodeHeight - 16
    );

    this.ctx.restore();
  }

  private wrapAiText(text: string, maxWidth: number, font: string): string[] {
    const words = (text || '').split(/\s+/).filter(Boolean);
    if (!words.length) {
      return [''];
    }

    const lines: string[] = [];
    let currentLine = '';

    this.ctx.save();
    this.ctx.font = font;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (this.ctx.measureText(testLine).width <= maxWidth || !currentLine) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    this.ctx.restore();

    return lines.length ? lines : [''];
  }

  private truncateText(text: string, maxWidth: number): string {
    const safeText = text || '';
    if (!safeText) {
      return '';
    }

    this.ctx.save();
    this.ctx.font = '11px Arial';

    if (this.ctx.measureText(safeText).width <= maxWidth) {
      this.ctx.restore();
      return safeText;
    }

    let truncated = safeText;
    while (truncated.length > 0 && this.ctx.measureText(`${truncated}...`).width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }

    this.ctx.restore();
    return `${truncated}...`;
  }

  drawAiArrow(
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): void {

    this.ctx.save();

    const angle = Math.atan2(endY - startY, endX - startX);
    const arrowSize = 9;

    const lineGradient = this.ctx.createLinearGradient(startX, startY, endX, endY);
    lineGradient.addColorStop(0, '#9ca3af');
    lineGradient.addColorStop(1, '#6366f1');

    this.ctx.strokeStyle = lineGradient;
    this.ctx.fillStyle = '#6366f1';
    this.ctx.lineWidth = 2.2;
    this.ctx.shadowColor = 'rgba(99, 102, 241, 0.18)';
    this.ctx.shadowBlur = 8;

    // Line
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();

    // Arrow head
    this.ctx.beginPath();
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(
      endX - arrowSize * Math.cos(angle - Math.PI / 6),
      endY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.lineTo(
      endX - arrowSize * Math.cos(angle + Math.PI / 6),
      endY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }
}