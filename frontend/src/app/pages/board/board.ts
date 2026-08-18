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

import { ActivatedRoute } from '@angular/router';
import { BoardService } from '../../services/boardService/boardService';
import { SocketService } from '../../services/SocketService/socketService';

@Component({
  selector: 'app-board',
  imports: [
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './board.html',
  styleUrl: './board.css',
})
export class Board implements OnInit, AfterViewInit {

  private route = inject(ActivatedRoute);
  private boardService = inject(BoardService);
  private socketService=inject(SocketService);
  board = signal<any>(null);
  activeTool:
    | 'select'
    | 'hand'
    | 'pen'
    | 'eraser'
    | 'circle'
    | 'line'
    | 'text' = 'select';

  color = 'purple';
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
  private remoteLastX: number | null = null;
  private remoteLastY: number | null = null;
  private currentX = 0;
  private currentY = 0;

  @ViewChild('boardCanvas')
  canvas!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  ngOnInit(): void {

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadBoard(id);
      this.socketService.joinBoard(id)
    }
    this.socketService.onDraw((data)=>{
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

  }

  ngAfterViewInit(): void {

    const canvas = this.canvas.nativeElement;

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

    this.ctx.font = '12px Arial';

    this.ctx.fillStyle = this.color;

    this.ctx.fillText(
      this.currentText,
      canvasX,
      canvasY + (20 * scaleY)
    );
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

        console.error('Error loading board:', err);
      }

    });
  }

  startDrawing(event: MouseEvent): void {

    const { x, y } = this.getMousePosition(event);

    this.startX = x;
    this.startY = y;

    if (this.activeTool === 'select') {

      console.log('Select tool');

      return;
    }

    if (this.activeTool === 'hand') {

      console.log('Hand tool');

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
    if (this.activeTool === 'pen') {

      this.ctx.lineTo(x, y);
      this.ctx.stroke();

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

  stopDrawing(): void {

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

  } else if (
    this.activeTool === 'pen' ||
    this.activeTool === 'eraser'
  ) {

    this.socketService.drawEnd({
      boardId: this.board()?._id,
      tool: this.activeTool
    });
  }else if (this.activeTool === 'circle') {

  this.socketService.drawShape({
    boardId: this.board()?._id,
    tool: 'circle',
    startX: this.startX,
    startY: this.startY,
    endX: this.currentX,
    endY: this.currentY,
    color: this.color
  });
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

      console.error(
        'Board ID not found'
      );

      return;
    }

    const canvasData =
      this.canvas.nativeElement.toDataURL(
        'image/png'
      );


    const data = {
      canvasData: canvasData
    };


    console.log(
      'Saving canvas...'
    );


    this.boardService
      .updateBoard(
        data,
        this.board()._id
      )
      .subscribe({

        next: (res) => {

          console.log(
            'Board saved successfully',
            res
          );
        },

        error: (err) => {

          console.error(
            'Error saving board:',
            err
          );
        }

      });
  }

  addParticipant() {
    
  const email = this.participantEmail.trim();
  if (!email) {
    return;
  }

  const boardId = this.board()?._id;
  if (!boardId) {
    return;
  }

  this.boardService
    .addParticipant(boardId, email)
    .subscribe({
      next: (res: any) => {
        if (res.board) {
          // Create a new object reference to trigger change detection
          this.board.set({ ...res.board });
          console.log('Board updated with participants:', this.board()?.participants);
        } else {
          console.warn('No board in response');
        }
        
        this.participantEmail = '';
      },
      error: (err) => {
        console.error(
          'Failed to add participant',
          err.error?.message || err.message
        );
      }

    });
  }
}