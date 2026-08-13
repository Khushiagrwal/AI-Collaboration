import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-board',
  imports: [ReactiveFormsModule],
  templateUrl: './board.html',
  styleUrl: './board.css',
})

export class Board {
  boardForm = new FormGroup({
    title:new FormControl('Untitled Board',[Validators.required,Validators.minLength(5)])
  })

}
