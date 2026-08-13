import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/authService/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {

  constructor(
    private auth: Auth,
    private router: Router
  ) {}

  // Dashboard Statistics
  stats = {
    boards: 18,
    members: 42,
    messages: 67,
    meetings: 12
  };

  // Recent Activities
  activities = [
    {
      icon: '🎨',
      user: 'Khushi',
      action: 'Created UI Design Board'
    },
    {
      icon: '👨‍💻',
      user: 'Aryan',
      action: 'Joined Workspace'
    },
    {
      icon: '📤',
      user: 'You',
      action: 'Uploaded Project Files'
    },
    {
      icon: '🤖',
      user: 'AI Assistant',
      action: 'Generated Meeting Summary'
    }
  ];

  logout() {
    this.auth.logout();
    this.router.navigate(['']);
  }

  createBoard() {
    console.log('Create Board');
  }

  inviteTeam() {
    console.log('Invite Team');
  }

  videoMeeting() {
    console.log('Video Meeting');
  }

  shareWorkspace() {
    console.log('Share Workspace');
  }

}