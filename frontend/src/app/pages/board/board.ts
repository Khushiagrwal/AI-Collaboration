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

  @ViewChild('boardCanvas')
  canvas!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;

  ngOnInit(): void {

    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.loadBoard(id);
      this.socketService.joinBoard(id)
    }
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

    /*
      Text ko canvas ke correct coordinate par draw karna hai.
    */

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

        console.log('API response:', res);

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


    // =========================
    // SELECT
    // =========================

    if (this.activeTool === 'select') {

      console.log('Select tool');

      return;
    }


    // =========================
    // HAND
    // =========================

    if (this.activeTool === 'hand') {

      console.log('Hand tool');

      return;
    }


    // =========================
    // TEXT
    // =========================

    if (this.activeTool === 'text') {

      this.addText(event);

      return;
    }


    // =========================
    // Drawing starts here
    // =========================

    this.isDrawing = true;


    // Save current canvas
    this.snapshot = this.ctx.getImageData(
      0,
      0,
      this.canvas.nativeElement.width,
      this.canvas.nativeElement.height
    );


    // =========================
    // PEN
    // =========================

    if (this.activeTool === 'pen') {

      this.ctx.globalCompositeOperation = 'source-over';

      this.ctx.beginPath();

      this.ctx.moveTo(x, y);

      this.ctx.strokeStyle = this.color;

      this.ctx.lineWidth = 2;

      this.ctx.lineCap = 'round';

      return;
    }


    // =========================
    // ERASER
    // =========================

    if (this.activeTool === 'eraser') {

      this.ctx.globalCompositeOperation =
        'destination-out';

      this.ctx.beginPath();

      this.ctx.moveTo(x, y);

      this.ctx.lineWidth = 20;

      this.ctx.lineCap = 'round';

      return;
    }


    // =========================
    // LINE
    // =========================

    if (this.activeTool === 'line') {

      this.ctx.globalCompositeOperation =
        'source-over';

      this.ctx.strokeStyle = this.color;

      this.ctx.lineWidth = 2;

      return;
    }


    // =========================
    // CIRCLE
    // =========================

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


    // =========================
    // PEN
    // =========================

    if (this.activeTool === 'pen') {

      this.ctx.lineTo(x, y);

      this.ctx.stroke();

      return;
    }


    // =========================
    // ERASER
    // =========================

    if (this.activeTool === 'eraser') {

      this.ctx.lineTo(x, y);

      this.ctx.stroke();

      return;
    }


    // =========================
    // LINE
    // =========================

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


    // =========================
    // CIRCLE
    // =========================

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

    this.ctx.closePath();

    /*
      Eraser ke baad canvas ko
      normal drawing mode mein lao.
    */

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
        console.log('Response from addParticipant:', res);
        console.log('Board data:', res.board);
        console.log('Participants:', res.board?.participants);
        
        // Ensure we're setting the full board object with participants
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