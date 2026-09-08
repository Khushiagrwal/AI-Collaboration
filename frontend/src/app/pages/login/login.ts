import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import { Auth } from '../../services/authService/auth';
import { InvitationService } from '../../services/invitation/invite';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

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

  loginForm = new FormGroup({
    email: new FormControl('', [
      Validators.required,
      Validators.email
    ]),

    password: new FormControl('', [
      Validators.required,
      Validators.minLength(6)
    ])
  });

  submit() {

    this.auth.login(this.loginForm.value).subscribe({

      next: (res: any) => {

        localStorage.setItem("token", res.token);

        // Check invitation token
        const inviteToken = this.inviteToken;

        // User came from invitation
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

          // Normal login
          this.router.navigate(['dashboard']);

        }

      },

      error: (err) => {
        this.notifications.error(err.error?.message || 'Unable to login. Check your email and password.');
      }

    });

  }
}