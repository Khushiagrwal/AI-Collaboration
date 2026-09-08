import { TestBed } from '@angular/core/testing';

import { Canva } from './canva';

describe('Canva', () => {
  let service: Canva;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Canva);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
