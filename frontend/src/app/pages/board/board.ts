import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';

import { Canva } from '../../services/canvas/canva';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BoardService } from '../../services/boardService/boardService';
import { SocketService } from '../../services/SocketService/socketService';
import { InvitationService } from '../../services/invitation/invite';
import { NotificationService } from '../../services/notification.service';
import { AiPanalModal } from '../../components/ai-panel/ai-panal-modal/ai-panal-modal';
import { CanvasElement } from '../../models/canvas-element.model';
import { AiDiagram, AiDiagramLayout } from '../../models/ai-diagram.model';
import { layoutAiDiagram, normalizeAiDiagram } from '../../services/canvas/ai-diagram-layout';

const BASE_CANVAS_WIDTH = 1200;
const BASE_CANVAS_HEIGHT = 800;
const MAX_CANVAS_DIMENSION = 16384;

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    AiPanalModal
  ],
  templateUrl: './board.html',
  styleUrl: './board.css',
})
export class Board implements OnInit, AfterViewInit, OnDestroy {

  private route = inject(ActivatedRoute);
  private boardService = inject(BoardService);
  private socketService = inject(SocketService);
  private invitationService = inject(InvitationService);
  private notifications = inject(NotificationService);
  private canvaService = inject(Canva);

  board = signal<any>(null);
  currentUser = signal<any>(null);
  isOwner = signal(false);
  canvasElements = signal<CanvasElement[]>([]);
  aiDiagrams = signal<AiDiagram[]>([]);
  activeTool:
    | 'select'
    | 'hand'
    | 'pen'
    | 'eraser'
    | 'circle'
    | 'line'
    | 'text' = 'select';

  color = '#7955d9';
  showColorPicker = false;
  readonly colorPresets = [
    '#111827',
    '#ef4444',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#06b6d4',
    '#3b82f6',
    '#7955d9',
    '#ec4899'
  ];
  isDrawing = false;
  private startX = 0;
  private startY = 0;
  private snapshot!: ImageData;
  isTyping = false;
  isEditingAiLabel = false;
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
  private remoteStrokePoints = new Map<string, { x: number; y: number }>();
  private remoteStrokeElements = new Map<string, CanvasElement>();
  private currentX = 0;
  private currentY = 0;
  remoteCursors = signal<Record<string, any>>({});
  private lastCursorSent = 0;
  showAiModal = false;
  pendingAiDiagram = signal<AiDiagram | null>(null);
  saveStatus = 'Ready to save';
  isSaving = false;
  boardLoadError = false;
  selectedElement = signal<CanvasElement | null>(null);
  isDragging = false;

  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private activePenElement: CanvasElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private readonly socketUnsubscribers: Array<() => void> = [];
  private readonly queuedAiDiagrams: unknown[] = [];
  private pendingCanvasData: unknown = null;
  private legacyCanvasImage: HTMLImageElement | null = null;
  private legacyImagePlacement = { x: 0, y: 0, width: 0, height: 0 };
  private activePointerId: number | null = null;
  canvasCssWidth = BASE_CANVAS_WIDTH;
  canvasCssHeight = BASE_CANVAS_HEIGHT;
  canvasOffsetX = 0;
  canvasOffsetY = 0;
  canvasScrollLeft = 0;
  canvasScrollTop = 0;
  private textCanvasX = 0;
  private textCanvasY = 0;
  private panStartX = 0;
  private panStartY = 0;
  private panStartScrollLeft = 0;
  private panStartScrollTop = 0;
  private readonly onWindowResize = (): void => this.updateCanvasLayout();

  get remoteCursorEntries() {
    return Object.entries(this.remoteCursors());
  }

  get collaborators(): any[] {
    const people = [this.board()?.owner, ...(this.board()?.participants ?? [])]
      .filter(Boolean);
    const seen = new Set<string>();
    return people.filter(person => {
      const key = String(person._id ?? person.email ?? person.name ?? '');
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  get pendingDiagramNodes(): any[] {
    return (this.pendingAiDiagram()?.nodes ?? []).slice(0, 4);
  }

  get selectedAiNode(): { diagram: AiDiagram; node: AiDiagram['nodes'][number] } | null {
    const selected = this.selectedElement();
    const data = selected?.data;
    if (selected?.type !== 'ai' || !data?.diagramId || !data.nodeId) {
      return null;
    }
    const diagram = this.aiDiagrams().find(item => item.diagramId === data.diagramId);
    const node = diagram?.nodes.find(item => item.id === data.nodeId);
    return diagram && node ? { diagram, node } : null;
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
    this.socketUnsubscribers.push(this.socketService.onDraw((data) => {
      this.drawRemote(data);
    }));

    this.socketUnsubscribers.push(this.socketService.onDrawStart((data) => {
      this.remoteStrokePoints.set(data.socketId, { x: data.x, y: data.y });
      this.remoteStrokeElements.set(data.socketId, {
        id: crypto.randomUUID(),
        type: data.tool === 'eraser' ? 'eraser' : 'pen',
        color: data.color,
        points: [{ x: data.x, y: data.y }]
      });
    }));

    this.socketUnsubscribers.push(this.socketService.onDrawEnd((data) => {
      this.remoteStrokePoints.delete(data.socketId);
      const element = this.remoteStrokeElements.get(data.socketId);
      if (element) {
        this.canvasElements.update(elements => [...elements, element]);
        this.remoteStrokeElements.delete(data.socketId);
        this.renderCanvas();
      }
    }));

    this.socketUnsubscribers.push(this.socketService.onDrawShape((data) => {
      this.drawRemoteShape(data);
    }));

    this.socketUnsubscribers.push(this.socketService.onClearBoard(() => this.clearCanvasContent()));

    this.socketUnsubscribers.push(this.socketService.onCursorMove((data) => {
      this.remoteCursors.update(cursors => ({
        ...cursors,
        [data.socketId]: data
      }));
    }));

    this.socketUnsubscribers.push(this.socketService.onCursorLeave((data) => {
      this.remoteStrokePoints.delete(data.socketId);
      this.remoteStrokeElements.delete(data.socketId);
      this.remoteCursors.update(cursors => {
        const updated = { ...cursors };
        delete updated[data.socketId];
        return updated;
      });
    }));

    this.socketUnsubscribers.push(this.socketService.onAiDiagram((diagram) => {
      if (!this.ctx) {
        this.queuedAiDiagrams.push(diagram);
        return;
      }
      this.receiveAiDiagram(diagram);
    }));

  }

  ngAfterViewInit(): void {

    const canvas = this.canvas.nativeElement;
    canvas.width = BASE_CANVAS_WIDTH;
    canvas.height = BASE_CANVAS_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) {
      this.notifications.error('Could not initialize the whiteboard canvas');
      return;
    }
    this.ctx = context;

    this.setCanvasContextDefaults();
    const viewport = canvas.parentElement;
    if (viewport && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.updateCanvasLayout());
      this.resizeObserver.observe(viewport);
    } else {
      window.addEventListener('resize', this.onWindowResize);
    }
    this.updateCanvasLayout();

    if (this.pendingCanvasData !== null) {
      const data = this.pendingCanvasData;
      this.pendingCanvasData = null;
      this.loadSavedCanvas(data);
    } else if (this.aiDiagrams().length) {
      this.renderStoredAiDiagrams();
    }

    for (const diagram of this.queuedAiDiagrams.splice(0)) {
      this.receiveAiDiagram(diagram);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener('resize', this.onWindowResize);
    for (const unsubscribe of this.socketUnsubscribers.splice(0)) {
      unsubscribe();
    }
  }

  updateCanvasLayout(): void {
    if (!this.canvas?.nativeElement) {
      return;
    }
    const canvas = this.canvas.nativeElement;
    const viewport = canvas.parentElement;
    if (!viewport) {
      return;
    }

    const scale = Math.min(
      1,
      viewport.clientWidth / BASE_CANVAS_WIDTH || 1,
      viewport.clientHeight / BASE_CANVAS_HEIGHT || 1
    );
    this.canvasCssWidth = Math.max(1, canvas.width * scale);
    this.canvasCssHeight = Math.max(1, canvas.height * scale);
    this.canvasOffsetX = this.canvasCssWidth <= viewport.clientWidth
      ? (viewport.clientWidth - this.canvasCssWidth) / 2
      : 0;
    this.canvasOffsetY = this.canvasCssHeight <= viewport.clientHeight
      ? (viewport.clientHeight - this.canvasCssHeight) / 2
      : 0;
    this.canvasScrollLeft = viewport.scrollLeft;
    this.canvasScrollTop = viewport.scrollTop;

    if (this.isTyping && this.isEditingAiLabel) {
      const selected = this.selectedAiNode;
      if (selected?.node.x !== undefined && selected.node.y !== undefined) {
        this.textX = this.canvasOffsetX - this.canvasScrollLeft +
          (selected.node.x + (selected.node.width ?? 0) / 2) * scale;
        this.textY = this.canvasOffsetY - this.canvasScrollTop +
          (selected.node.y + (selected.node.height ?? 0) / 2) * scale;
      }
    } else if (this.isTyping) {
      this.textX = this.canvasOffsetX - this.canvasScrollLeft + this.textCanvasX * scale;
      this.textY = this.canvasOffsetY - this.canvasScrollTop + this.textCanvasY * scale;
    }
  }

  private setCanvasContextDefaults(): void {
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = this.color;
    this.ctx.lineWidth = 2;
  }

  private drawRemoteShape(data: any): void {
    if (!this.ctx) {
      return;
    }

    if (
      data.tool === 'line' &&
      [data.startX, data.startY, data.endX, data.endY].every(Number.isFinite) &&
      typeof data.color === 'string'
    ) {
      this.canvasElements.update(elements => [...elements, {
        id: crypto.randomUUID(),
        type: 'line',
        startX: data.startX,
        startY: data.startY,
        endX: data.endX,
        endY: data.endY,
        color: data.color
      }]);
    }
    if (
      data.tool === 'circle' &&
      [data.startX, data.startY, data.endX, data.endY].every(Number.isFinite) &&
      typeof data.color === 'string'
    ) {
      this.canvasElements.update(elements => [...elements, {
        id: crypto.randomUUID(),
        type: 'circle',
        startX: data.startX,
        startY: data.startY,
        endX: data.endX,
        endY: data.endY,
        color: data.color
      }]);
    }
    if (
      data.tool === 'text' &&
      Number.isFinite(data.x) &&
      Number.isFinite(data.y) &&
      typeof data.text === 'string' &&
      typeof data.color === 'string'
    ) {
      this.canvasElements.update(elements => [...elements, {
        id: crypto.randomUUID(),
        type: 'text',
        x: data.x,
        y: data.y,
        text: data.text,
        color: data.color
      }]);
    }
    this.renderCanvas();
  }

  private drawRemote(data: any): void {
    if (!this.ctx) {
      return;
    }
    const previousPoint = this.remoteStrokePoints.get(data.socketId);
    if (!previousPoint) {
      this.remoteStrokePoints.set(data.socketId, { x: data.x, y: data.y });
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

    this.ctx.moveTo(previousPoint.x, previousPoint.y);

    this.ctx.lineTo(
      data.x,
      data.y
    );

    this.ctx.stroke();

    this.ctx.restore();

    this.remoteStrokePoints.set(data.socketId, { x: data.x, y: data.y });
    this.remoteStrokeElements.get(data.socketId)?.points?.push({ x: data.x, y: data.y });
  }

  private getMousePosition(event: MouseEvent): { x: number; y: number } {

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
    const canvas = this.canvas.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (this.legacyCanvasImage) {
      this.ctx.drawImage(
        this.legacyCanvasImage,
        this.legacyImagePlacement.x,
        this.legacyImagePlacement.y,
        this.legacyImagePlacement.width,
        this.legacyImagePlacement.height
      );
    }
    for (const diagram of this.aiDiagrams()) {
      const layout = layoutAiDiagram(diagram);
      for (const edge of layout.edges) {
        this.drawAiEdge(edge, 0);
      }
    }
    this.canvaService.render(
      this.ctx,
      this.canvasElements(),
      this.selectedElement(),
      false
    );
    this.updateCanvasLayout();
  }
  private addText(event: MouseEvent): void {

    const position = this.getMousePosition(event);
    this.textCanvasX = position.x;
    this.textCanvasY = position.y;
    this.currentText = '';
    this.isTyping = true;
    this.updateCanvasLayout();
  }

  finishText(): void {

    if (!this.currentText.trim()) {

      this.cancelText();

      return;
    }

    if (this.isEditingAiLabel) {
      const selected = this.selectedAiNode;
      if (!selected) {
        this.cancelText();
        return;
      }
      const label = this.currentText.trim();
      const updatedDiagram = {
        ...selected.diagram,
        nodes: selected.diagram.nodes.map(node =>
          node.id === selected.node.id ? { ...node, label } : node
        )
      };
      this.aiDiagrams.update(diagrams => diagrams.map(diagram =>
        diagram.diagramId === updatedDiagram.diagramId ? updatedDiagram : diagram
      ));
      this.syncAiCanvasElements();
      this.selectedElement.set(
        this.canvasElements().find(element =>
          element.data?.nodeId === selected.node.id
        ) ?? null
      );
      this.isTyping = false;
      this.isEditingAiLabel = false;
      this.currentText = '';
      this.renderCanvas();
      this.socketService.sendAiDiagram({
        boardId: this.board()?._id,
        diagram: updatedDiagram
      });
      return;
    }

    const canvas = this.canvas.nativeElement;

    const canvasX = this.textCanvasX;
    const canvasY = this.textCanvasY;

    this.ctx.globalCompositeOperation = 'source-over';

    this.ctx.font = '20px Arial';
    this.ctx.fillStyle = this.color;

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
    this.renderCanvas();
    this.currentText = '';

    this.isTyping = false;
  }

  cancelText(): void {

    this.currentText = '';

    this.isTyping = false;
    this.isEditingAiLabel = false;
  }

  editSelectedAiLabel(): void {
    const selected = this.selectedAiNode;
    if (!selected) {
      return;
    }
    this.currentText = selected.node.label;
    this.isTyping = true;
    this.isEditingAiLabel = true;
    this.updateCanvasLayout();
  }

  deleteSelectedAiNode(): void {
    const selected = this.selectedAiNode;
    if (!selected) {
      return;
    }
    const { diagram } = selected;
    const remainingNodes = diagram.nodes.filter(node => node.id !== selected.node.id);
    if (remainingNodes.length) {
      const updatedDiagram: AiDiagram = {
        ...diagram,
        nodes: remainingNodes,
        edges: diagram.edges.filter(edge =>
          edge.source !== selected.node.id && edge.target !== selected.node.id
        )
      };
      this.aiDiagrams.update(diagrams => diagrams.map(item =>
        item.diagramId === diagram.diagramId ? updatedDiagram : item
      ));
      this.socketService.sendAiDiagram({
        boardId: this.board()?._id,
        diagram: updatedDiagram
      });
    } else {
      this.aiDiagrams.update(diagrams =>
        diagrams.filter(item => item.diagramId !== diagram.diagramId)
      );
      this.socketService.sendAiDiagram({
        boardId: this.board()?._id,
        diagram: {
          diagramId: diagram.diagramId,
          deletedNodeId: selected.node.id,
          deletedDiagram: true
        }
      });
    }
    this.selectedElement.set(null);
    this.syncAiCanvasElements();
    this.renderCanvas();
  }

  loadBoard(id: string): void {

    this.boardService.getBoard(id).subscribe({

      next: (res: any) => {
        this.boardLoadError = false;
        this.board.set(res.board);
        this.currentUser.set(res.currentUser);
        this.isOwner.set(res.isOwner === true);
        const savedDiagrams = Array.isArray(res.board?.aiDiagrams)
          ? res.board.aiDiagrams
              .map((diagram: unknown) => normalizeAiDiagram(diagram))
              .filter((diagram: AiDiagram | null): diagram is AiDiagram => diagram !== null)
              .map((diagram: AiDiagram) => this.positionDiagram(diagram))
          : [];
        this.aiDiagrams.set(savedDiagrams);
        this.syncAiCanvasElements();

        const data = res.board?.canvasData;

        if (!data || (Array.isArray(data) && !data.length)) {
          if (this.ctx && savedDiagrams.length) {
            this.renderStoredAiDiagrams();
          }
          return;
        }

        if (this.ctx) {
          this.loadSavedCanvas(data);
        } else {
          this.pendingCanvasData = data;
        }
      },
      error: (err) => {
        this.boardLoadError = true;
        this.notifications.error(err.error?.message || 'Could not load this board');
      }

    });
  }

  private loadSavedCanvas(data: unknown): void {
    const source = Array.isArray(data) ? data.join('') : data;
    if (typeof source !== 'string' || !source) {
      this.notifications.error('The saved board canvas data is invalid');
      return;
    }

    const image = new Image();
    image.onload = () => {
      const scale = Math.max(
        1,
        Math.min(
          BASE_CANVAS_WIDTH / image.naturalWidth,
          BASE_CANVAS_HEIGHT / image.naturalHeight
        )
      );
      const imageWidth = image.naturalWidth * scale;
      const imageHeight = image.naturalHeight * scale;
      const width = Math.max(BASE_CANVAS_WIDTH, Math.ceil(imageWidth));
      const height = Math.max(BASE_CANVAS_HEIGHT, Math.ceil(imageHeight));
      if (!this.resizeCanvas(width, height)) {
        return;
      }
      const canvas = this.canvas.nativeElement;
      this.ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.legacyCanvasImage = image;
      this.legacyImagePlacement = {
        x: (canvas.width - imageWidth) / 2,
        y: (canvas.height - imageHeight) / 2,
        width: imageWidth,
        height: imageHeight
      };
      this.ctx.drawImage(
        image,
        this.legacyImagePlacement.x,
        this.legacyImagePlacement.y,
        imageWidth,
        imageHeight
      );
      this.renderCanvas();
      this.updateCanvasLayout();
    };
    image.onerror = () => this.notifications.error('Could not load the saved board canvas');
    image.src = source;
  }

  private resizeCanvas(width: number, height: number): boolean {
    const canvas = this.canvas.nativeElement;
    const nextWidth = Math.ceil(Math.max(canvas.width, width));
    const nextHeight = Math.ceil(Math.max(canvas.height, height));
    if (
      nextWidth > MAX_CANVAS_DIMENSION ||
      nextHeight > MAX_CANVAS_DIMENSION
    ) {
      this.notifications.error('This diagram exceeds the maximum supported canvas size');
      return false;
    }
    if (nextWidth === canvas.width && nextHeight === canvas.height) {
      return true;
    }

    const snapshot = document.createElement('canvas');
    snapshot.width = canvas.width;
    snapshot.height = canvas.height;
    const snapshotContext = snapshot.getContext('2d');
    if (!snapshotContext) {
      this.notifications.error('Could not preserve the current canvas while resizing');
      return false;
    }
    snapshotContext.drawImage(canvas, 0, 0);

    canvas.width = nextWidth;
    canvas.height = nextHeight;
    this.setCanvasContextDefaults();
    this.ctx.drawImage(snapshot, 0, 0);
    this.updateCanvasLayout();
    return true;
  }

  startDrawing(event: PointerEvent): void {
    if (!event.isPrimary || this.activePointerId !== null) {
      return;
    }
    this.activePointerId = event.pointerId;
    this.canvas.nativeElement.setPointerCapture(event.pointerId);
    event.preventDefault();

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
        } else if (element.type === 'ai') {
          this.dragOffsetX = x - (element.x ?? 0);
          this.dragOffsetY = y - (element.y ?? 0);
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
      const viewport = this.canvas.nativeElement.parentElement;
      if (!viewport) {
        this.activePointerId = null;
        return;
      }
      this.isDrawing = true;
      this.panStartX = event.clientX;
      this.panStartY = event.clientY;
      this.panStartScrollLeft = viewport.scrollLeft;
      this.panStartScrollTop = viewport.scrollTop;
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
      this.ctx.lineWidth = 20;
      this.ctx.lineCap = 'round';
      this.activePenElement = {
        id: crypto.randomUUID(),
        type: 'eraser',
        points: [{ x, y }]
      };
      this.canvasElements.update(elements => [...elements, this.activePenElement!]);
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

  draw(event: PointerEvent): void {

    if (!this.isDrawing ||
      (this.activePointerId !== null && event.pointerId !== this.activePointerId)) {
      return;
    }

    const { x, y } = this.getMousePosition(event);
    this.currentX = x;
    this.currentY = y;
    if (this.activeTool === 'hand') {
      const viewport = this.canvas.nativeElement.parentElement;
      if (viewport) {
        viewport.scrollLeft = this.panStartScrollLeft - (event.clientX - this.panStartX);
        viewport.scrollTop = this.panStartScrollTop - (event.clientY - this.panStartY);
      }
      this.updateCanvasLayout();
      return;
    }
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

      if (element.type === 'ai') {
        const nextX = x - this.dragOffsetX;
        const nextY = y - this.dragOffsetY;
        const data = element.data;
        if (!data?.diagramId || !data.nodeId) {
          return;
        }
        this.aiDiagrams.update(diagrams => diagrams.map(diagram =>
          diagram.diagramId !== data.diagramId
            ? diagram
            : {
              ...diagram,
              nodes: diagram.nodes.map(node => node.id === data.nodeId
                ? { ...node, x: nextX, y: nextY }
                : node)
            }
        ));
        this.syncAiCanvasElements();
        this.selectedElement.set(
          this.canvasElements().find(item => item.id === element.id) ?? null
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

      this.ctx.beginPath();
      this.ctx.moveTo(this.startX, this.startY);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      this.startX = x;
      this.startY = y;
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

      this.ctx.beginPath();
      this.ctx.moveTo(this.startX, this.startY);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      this.startX = x;
      this.startY = y;
      this.activePenElement?.points?.push({ x, y });
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

  trackCursor(event: PointerEvent): void {
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

  stopDrawing(event?: PointerEvent): void {
    if (
      event &&
      this.activePointerId !== null &&
      event.pointerId !== this.activePointerId
    ) {
      return;
    }
    this.activePointerId = null;

    if (this.activeTool === 'select') {

      if (this.isDragging) {
        const selected = this.selectedAiNode;
        if (selected) {
          this.socketService.sendAiDiagram({
            boardId: this.board()?._id,
            diagram: selected.diagram
          });
        }
      }
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
    this.clearCanvasContent();
    this.socketService.clearBoard(
      this.board()?._id
    );
  }

  private clearCanvasContent(): void {
    if (!this.ctx || !this.canvas?.nativeElement) {
      return;
    }
    this.ctx.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
    this.canvasElements.set([]);
    this.aiDiagrams.set([]);
    this.legacyCanvasImage = null;
    this.legacyImagePlacement = { x: 0, y: 0, width: 0, height: 0 };
    this.canvaService.clear();
    this.selectedElement.set(null);
    this.remoteStrokePoints.clear();
    this.remoteStrokeElements.clear();
  }

  saveBoard(): void {

    if (!this.board()?._id) {

      this.notifications.error('Board ID not found');

      return;
    }

    this.isSaving = true;
    this.saveStatus = 'Saving…';
    const canvasData = this.createCanvasSnapshotWithoutAi();
    if (!canvasData) {
      this.isSaving = false;
      this.saveStatus = 'Save failed';
      return;
    }


    const data = {
      canvasData,
      aiDiagrams: this.aiDiagrams()
    };


    this.boardService
      .updateBoard(
        data,
        this.board()._id
      )
      .subscribe({

        next: (res) => {
          this.isSaving = false;
          this.saveStatus = 'Saved just now';
          this.notifications.success('Board saved successfully');
        },

        error: (err) => {
          this.isSaving = false;
          this.saveStatus = 'Save failed';
          this.notifications.error(err.error?.message || 'Could not save board');
        }
      });
  }

  private createCanvasSnapshotWithoutAi(): string | null {
    const source = this.canvas.nativeElement;
    const snapshot = document.createElement('canvas');
    snapshot.width = source.width;
    snapshot.height = source.height;
    const context = snapshot.getContext('2d');
    if (!context) {
      this.notifications.error('Could not prepare the board for saving');
      return null;
    }
    if (this.legacyCanvasImage) {
      context.drawImage(
        this.legacyCanvasImage,
        this.legacyImagePlacement.x,
        this.legacyImagePlacement.y,
        this.legacyImagePlacement.width,
        this.legacyImagePlacement.height
      );
    }
    const nonAiElements = this.canvasElements().filter(element => element.type !== 'ai');
    this.canvaService.render(context, nonAiElements, null, false);
    return snapshot.toDataURL('image/png');
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

  onDiagramGenerated(value: unknown): void {
    const diagram = normalizeAiDiagram(value);
    if (!diagram) {
      this.notifications.error('The AI returned an invalid diagram. Please try again.');
      this.showAiModal = false;
      return;
    }
    this.pendingAiDiagram.set(diagram);
    this.showAiModal = false;
  }

  applyAiDiagram(): void {
    const diagram = this.pendingAiDiagram();
    if (!diagram) {
      return;
    }

    const diagramToApply = {
      ...diagram,
      diagramId: diagram.diagramId || crypto.randomUUID()
    };
    if (!this.drawAiDiagram(diagramToApply)) {
      return;
    }
    const positionedDiagram = this.aiDiagrams().find(item =>
      item.diagramId === diagramToApply.diagramId
    );
    if (!positionedDiagram) {
      this.notifications.error('Could not add the AI diagram to the board');
      return;
    }
    this.socketService.sendAiDiagram({
      boardId: this.board()?._id,
      diagram: positionedDiagram
    });
    this.pendingAiDiagram.set(null);
    this.notifications.success('AI diagram added to the board');
  }

  rejectAiDiagram(): void {
    this.pendingAiDiagram.set(null);
  }

  drawAiDiagram(value: unknown): boolean {
    const normalized = normalizeAiDiagram(value);
    if (!normalized) {
      this.notifications.error('The AI returned an invalid diagram. Please try again.');
      return false;
    }
    const existingIndex = normalized.diagramId
      ? this.aiDiagrams().findIndex(item => item.diagramId === normalized.diagramId)
      : -1;
    let offsetY = 0;
    if (existingIndex < 0) {
      for (const existing of this.aiDiagrams()) {
        offsetY += this.getAiDiagramContentHeight(existing) + 48;
      }
    }
    const diagram = this.positionDiagram(normalized, offsetY);
    const nextDiagrams = [...this.aiDiagrams()];
    if (existingIndex >= 0) {
      nextDiagrams[existingIndex] = diagram;
    } else {
      nextDiagrams.push(diagram);
    }
    const requiredWidth = Math.max(
      this.canvas.nativeElement.width,
      ...nextDiagrams.map(item => layoutAiDiagram(item).width)
    );
    const requiredHeight = Math.max(
      this.canvas.nativeElement.height,
      ...nextDiagrams.map(item => layoutAiDiagram(item).height)
    );
    if (!this.resizeCanvas(requiredWidth, requiredHeight)) {
      return false;
    }
    this.aiDiagrams.set(nextDiagrams);
    this.syncAiCanvasElements();
    this.renderCanvas();
    return true;
  }

  private receiveAiDiagram(value: unknown): void {
    if (
      value &&
      typeof value === 'object' &&
      'diagramId' in value &&
      typeof value.diagramId === 'string' &&
      'deletedNodeId' in value &&
      typeof value.deletedNodeId === 'string'
    ) {
      const update = value as { diagramId: string; deletedNodeId: string; deletedDiagram?: boolean };
      if (update.deletedDiagram) {
        this.aiDiagrams.update(diagrams =>
          diagrams.filter(diagram => diagram.diagramId !== update.diagramId)
        );
      } else {
        this.aiDiagrams.update(diagrams => diagrams.flatMap(diagram => {
          if (diagram.diagramId !== update.diagramId) {
            return [diagram];
          }
          const nodes = diagram.nodes.filter(node => node.id !== update.deletedNodeId);
          return nodes.length
            ? [{
              ...diagram,
              nodes,
              edges: diagram.edges.filter(edge =>
                edge.source !== update.deletedNodeId && edge.target !== update.deletedNodeId
              )
            }]
            : [];
        }));
      }
      this.syncAiCanvasElements();
      this.renderCanvas();
      return;
    }
    if (this.drawAiDiagram(value)) {
      this.notifications.success('A collaborator added an AI diagram');
    }
  }

  private renderStoredAiDiagrams(): void {
    this.syncAiCanvasElements();
    this.renderCanvas();
  }

  private getAiDiagramContentHeight(diagram: AiDiagram): number {
    const layout = layoutAiDiagram(diagram);
    let bottom = 0;
    for (const position of Object.values(layout.positions)) {
      bottom = Math.max(bottom, position.y + position.height);
    }
    return bottom;
  }

  private positionDiagram(diagram: AiDiagram, offsetY = 0): AiDiagram {
    const positionedDiagram: AiDiagram = {
      ...diagram,
      diagramId: diagram.diagramId || crypto.randomUUID()
    };
    const layout = layoutAiDiagram(positionedDiagram);
    return {
      ...positionedDiagram,
      nodes: positionedDiagram.nodes.map(node => {
        const position = layout.positions[node.id];
        return {
          ...node,
          x: node.x ?? position.x,
          y: node.y ?? position.y + offsetY,
          width: node.width ?? position.width,
          height: node.height ?? position.height
        };
      })
    };
  }

  private syncAiCanvasElements(): void {
    const aiElements: CanvasElement[] = [];
    for (const diagram of this.aiDiagrams()) {
      if (!diagram.diagramId) {
        continue;
      }
      for (const node of diagram.nodes) {
        if (
          node.x === undefined ||
          node.y === undefined ||
          node.width === undefined ||
          node.height === undefined
        ) {
          continue;
        }
        aiElements.push({
          id: `ai:${diagram.diagramId}:${node.id}`,
          type: 'ai',
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          text: node.label,
          shape: node.shape,
          color: '#7955d9',
          data: { diagramId: diagram.diagramId, nodeId: node.id }
        });
      }
    }
    this.canvasElements.set([
      ...this.canvasElements().filter(element => element.type !== 'ai'),
      ...aiElements
    ]);
  }

  private drawAiEdge(edgeLayout: AiDiagramLayout['edges'][number], offsetY: number): void {
    const { points, edge } = edgeLayout;
    const offsetPoints = points.map(point => ({ x: point.x, y: point.y + offsetY }));
    const start = offsetPoints[0];
    const end = offsetPoints[offsetPoints.length - 1];
    const previous = offsetPoints[offsetPoints.length - 2];
    const angle = Math.atan2(end.y - previous.y, end.x - previous.x);
    const arrowSize = 9;

    this.ctx.save();
    const gradient = this.ctx.createLinearGradient(start.x, start.y, end.x, end.y);
    gradient.addColorStop(0, '#9ca3af');
    gradient.addColorStop(1, '#7955d9');
    this.ctx.strokeStyle = gradient;
    this.ctx.fillStyle = '#7955d9';
    this.ctx.lineWidth = 2.2;
    this.ctx.shadowColor = 'rgba(121, 85, 217, 0.18)';
    this.ctx.shadowBlur = 6;
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    for (const point of offsetPoints.slice(1)) {
      this.ctx.lineTo(point.x, point.y);
    }
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - arrowSize * Math.cos(angle - Math.PI / 6),
      end.y - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.lineTo(
      end.x - arrowSize * Math.cos(angle + Math.PI / 6),
      end.y - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();

    if (edge.label) {
      this.ctx.save();
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      const textWidth = this.ctx.measureText(edge.label).width;
      this.ctx.fillStyle = '#fffdfa';
      const labelY = edgeLayout.labelY + offsetY;
      this.ctx.fillRect(edgeLayout.labelX - textWidth / 2 - 5, labelY - 9, textWidth + 10, 18);
      this.ctx.fillStyle = '#5b4b85';
      this.ctx.fillText(edge.label, edgeLayout.labelX, labelY);
      this.ctx.restore();
    }
  }

}