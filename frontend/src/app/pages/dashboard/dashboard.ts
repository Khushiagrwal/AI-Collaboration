import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/authService/auth';
import { CreateBoardModal } from '../../components/create-board-modal/create-board-modal';
import { CommonModule } from '@angular/common';
import { Board } from '../../services/boardService/board';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink,CreateBoardModal,CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {

  constructor(
    private auth: Auth,
    private boardService:Board,
    private router: Router
  ) {}

  ngOnInit(){
    this.loadBoards();
  }

  activeTab: string = 'dashboard';
  boards:any[]=[]
  
  loadBoards(){
    this.boardService.getBoards().subscribe({
      next:(res:any)=>{
        this.boards=res.boards;
        console.log("Successfully loads",res.boards)
      },error:(err:any)=>{
        alert(err?.message)
      }
    })
  }
  
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

  showCreateModal=false;

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