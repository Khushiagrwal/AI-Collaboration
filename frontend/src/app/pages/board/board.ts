import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BoardService } from '../../services/boardService/boardService';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-board',
  imports: [ReactiveFormsModule],
  templateUrl: './board.html',
  styleUrl: './board.css',
})
export class Board {

  private route = inject(ActivatedRoute);
  private boardService = inject(BoardService);

  board = signal<any>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.loadBoard(id);
    }
  }

  loadBoard(id: string) {
    this.boardService.getBoard(id).subscribe({
      next: (res: any) => {
        this.board.set(res.board);
      },
      error: (err) => {
        console.error(err);
      }
    });
  }
}