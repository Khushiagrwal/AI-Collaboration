import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { Auth } from '../../services/authService/auth';
import { InvitationService } from '../../services/invitation/invite';
import { NotificationService } from '../../services/notification.service';

import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  const auth = { login: vi.fn(() => of({ token: 'test-token' })) };
  const router = { navigate: vi.fn() };
  const route = { snapshot: { queryParamMap: { get: vi.fn(() => null) } } };
  const invitationService = { acceptInvitation: vi.fn() };
  const notifications = { error: vi.fn() };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: Auth, useValue: auth },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: InvitationService, useValue: invitationService },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compileComponents();

    auth.login.mockClear();
    router.navigate.mockClear();
    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.removeItem('token');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('marks invalid fields and does not submit the login request', () => {
    component.submit();

    expect(auth.login).not.toHaveBeenCalled();
    expect(component.loginForm.controls.email.touched).toBe(true);
    expect(component.loginForm.controls.password.touched).toBe(true);
  });

  it('submits valid credentials', () => {
    component.loginForm.setValue({
      email: 'user@example.com',
      password: 'password123',
    });

    component.submit();

    expect(auth.login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(localStorage.getItem('token')).toBe('test-token');
    expect(router.navigate).toHaveBeenCalledWith(['dashboard']);
  });
});
