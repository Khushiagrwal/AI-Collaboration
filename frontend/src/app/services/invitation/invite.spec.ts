import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { InvitationService } from './invite';

describe('InvitationService', () => {
  let service: InvitationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(InvitationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
