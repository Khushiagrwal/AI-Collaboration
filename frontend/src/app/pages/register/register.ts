import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { Auth } from '../../services/authService/auth';
import { InvitationService } from '../../services/invitation/invite';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {

  constructor(
    private auth: Auth,
    private router: Router,
    private route: ActivatedRoute,
    private invitationService: InvitationService,
    private notifications: NotificationService
  ) {}

  get inviteToken(): string | null {
    return this.route.snapshot.queryParamMap.get('invite');
  }
  registerForm = new FormGroup({

    name: new FormControl('', [
      Validators.required,
      Validators.minLength(3)
    ]),

    email: new FormControl('', [
      Validators.required,
      Validators.email
    ]),

    password: new FormControl('', [
      Validators.required,
      Validators.minLength(6)
    ]),

    confirmPassword: new FormControl('', [
      Validators.required
    ])

  });

  register() {

  if (this.registerForm.invalid) {
    this.registerForm.markAllAsTouched();
    return;
  }

  if (
    this.registerForm.value.password !==
    this.registerForm.value.confirmPassword
  ) {
    this.notifications.error('Passwords do not match');
    return;
  }

  const user = {
    name: this.registerForm.value.name,
    email: this.registerForm.value.email,
    password: this.registerForm.value.password
  };

  this.auth.register(user).subscribe({
    next: (res) => {
      console.log(res);
      localStorage.setItem('token', (res as any).token);

      const inviteToken = this.route.snapshot.queryParamMap.get('invite');

      if (inviteToken) {
        this.invitationService.acceptInvitation(inviteToken).subscribe({
          next: (inviteRes: any) => {
            this.router.navigate(['/board', inviteRes.boardId]);
          },
          error: (err) => {
            this.notifications.error(
              err.error?.message || 'Could not accept this invitation'
            );
            this.router.navigate(['/invite', inviteToken], {
              queryParams: { reason: err.status === 403 ? 'wrong-account' : 'accept-failed' }
            });
          }
        });
      } else {
        this.router.navigate(['dashboard']);
      }

      this.notifications.success('Account created successfully');
    },
    error: (err) => {
      this.notifications.error(err.error?.message || 'Registration failed. Please try again.');
    }
  });
}

}