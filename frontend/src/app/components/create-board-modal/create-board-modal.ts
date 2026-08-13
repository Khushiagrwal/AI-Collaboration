import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Board } from '../../services/boardService/board';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-board-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './create-board-modal.html',
  styleUrl: './create-board-modal.css',
})
export class CreateBoardModal {
  constructor(private Board:Board,private router:Router){}
  
  title:string=""

  createBoard(){
    this.Board.createBoard({
    title: this.title
  }).subscribe({
      next:(res:any)=>{
        this.router.navigate(['dashboard']);
        alert("Registered Successfully");
      },
      error:(err)=>{
        alert(err.error?.message)
      }
    })
  }
}
