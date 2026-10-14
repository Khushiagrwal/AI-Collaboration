import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { BoardService } from './boardService';

describe('BoardService', () => {
  let service: BoardService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(BoardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
