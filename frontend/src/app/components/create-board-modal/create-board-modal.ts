import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BoardService } from '../../services/boardService/boardService';
import { Router } from '@angular/router';
import { Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-create-board-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './create-board-modal.html',
  styleUrl: './create-board-modal.css',
})
export class CreateBoardModal {
  
  constructor(private Board:BoardService,private router:Router){}
  
  @Output() close = new EventEmitter<void>();
  @Output() boardCreated = new EventEmitter<void>();

  title:string=""

  createBoard(){
    this.Board.createBoard({
    title: this.title
  }).subscribe({
      next:(res:any)=>{
        this.boardCreated.emit();   // parent ko batao
        this.close.emit();
        alert("Registered Successfully");
      },
      error:(err)=>{
        alert(err.error?.message)
      }
    })
  }

  closeModal(){
   this.close.emit();
  }
  
}
