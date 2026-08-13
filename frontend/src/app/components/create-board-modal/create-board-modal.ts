import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-create-board-modal',
  imports: [CommonModule],
  templateUrl: './create-board-modal.html',
  styleUrl: './create-board-modal.css',
})
export class CreateBoardModal {
  showModal = false;

newBoard = {
  title: ''
};

openModal() {
  this.showModal = true;
}

closeModal() {
  this.showModal = false;
  this.newBoard.title = '';
}
}
