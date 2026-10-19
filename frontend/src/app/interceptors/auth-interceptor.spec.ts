import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { authInterceptor } from './auth-interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  const router = { navigate: vi.fn().mockResolvedValue(true) };

  beforeEach(() => {
    localStorage.removeItem('token');
    router.navigate.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    localStorage.removeItem('token');
    httpTesting.verify();
  });

  it('adds the Bearer token to requests', () => {
    localStorage.setItem('token', 'valid-token');

    http.get('/protected').subscribe();

    const request = httpTesting.expectOne('/protected');
    expect(request.request.headers.get('Authorization')).toBe('Bearer valid-token');
    request.flush({});
  });

  it('clears an expired token and redirects to login after a 401', () => {
    localStorage.setItem('token', 'expired-token');

    http.get('/protected').subscribe({ error: () => {} });

    httpTesting.expectOne('/protected').flush(
      { message: 'Invalid or expired token' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(localStorage.getItem('token')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('does not redirect for a 401 when there is no authenticated token', () => {
    http.get('/login').subscribe({ error: () => {} });

    httpTesting.expectOne('/login').flush(
      { message: 'Invalid credentials' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(router.navigate).not.toHaveBeenCalled();
  });
});
