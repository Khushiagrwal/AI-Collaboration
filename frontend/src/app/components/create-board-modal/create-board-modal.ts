import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BoardService } from '../../services/boardService/boardService';
import { Router } from '@angular/router';
import { Output, EventEmitter } from '@angular/core';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-create-board-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './create-board-modal.html',
  styleUrl: './create-board-modal.css',
})
export class CreateBoardModal {
  
  constructor(
    private Board: BoardService,
    private router: Router,
    private notifications: NotificationService
  ){}
  
  @Output() close = new EventEmitter<void>();
  @Output() boardCreated = new EventEmitter<any>();

  title:string=""

  createBoard(){
    this.Board.createBoard({
    title: this.title
  }).subscribe({
      next:(res:any)=>{
        this.boardCreated.emit(res.board);   // parent ko batao with created board
        this.close.emit();
        this.notifications.success('Board created successfully');
      },
      error:(err)=>{
        this.notifications.error(err.error?.message || 'Could not create board');
      }
    })
  }

  closeModal(){
   this.close.emit();
  }
  
}
