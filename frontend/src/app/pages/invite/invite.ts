import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InvitationService } from '../../services/invitation/invite';
import { NotificationService } from '../../services/notification.service';
import { Auth } from '../../services/authService/auth';

@Component({
  selector: 'app-invite',
  standalone: true,
  templateUrl: './invite.html',
  styleUrl: './invite.css'
})
export class Invite{

  private route = inject(ActivatedRoute);
  private invitationService = inject(InvitationService);
  private notifications = inject(NotificationService);
  private auth = inject(Auth);
  private router=inject(Router)
  private changeDetector = inject(ChangeDetectorRef);
  token = '';
  invitation: any = null;
  error = '';
  loading = true;
  wrongAccount = false;

  ngOnInit() {

    this.token = this.route.snapshot.paramMap.get('token') || '';

    if (this.route.snapshot.queryParamMap.get('reason') === 'wrong-account') {
      this.wrongAccount = true;
      this.error = 'This invitation belongs to another email. Please log in with the invited email address.';
    }

    console.log('Invite Token:', this.token);

    if (!this.token) {
      this.loading = false;
      this.error = 'Invalid invitation link';
      this.changeDetector.markForCheck();
      return;
    }

    this.invitationService.getInvitation(this.token)
      .subscribe({
        next: (res: any) => {
          console.log('Invitation:', res);

          this.invitation = res.invitation;
          this.loading = false;
          this.changeDetector.markForCheck();
        },

        error: (err) => {
            this.wrongAccount = err.status === 403;
            this.error = err.error?.message || 'Invalid invitation link';
          this.notifications.error(this.error);
          this.loading = false;
          this.changeDetector.markForCheck();
        }
      });
  }
  acceptInvitation() {

  const token = localStorage.getItem('token');

  // User logged in nahi hai
  if (!token) {

    this.router.navigate(
      ['/'],
      {
        queryParams: {
          invite: this.token
        }
      }
    );

    return;
  }

  // User logged in hai → invitation accept
  this.invitationService
    .acceptInvitation(this.token)
    .subscribe({

      next: (res: any) => {

        console.log('Invitation accepted:', res);

        this.router.navigate(
          ['/board', res.boardId]
        );
      },

      error: (err) => {
        this.wrongAccount = err.status === 403;
        this.error = err.error?.message || 'Could not accept invitation';
        this.notifications.error(this.error);
        this.changeDetector.markForCheck();
      }

    });
}

  switchAccount(): void {
    this.auth.logout();
    this.router.navigate(['/'], {
      queryParams: { invite: this.token }
    });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}