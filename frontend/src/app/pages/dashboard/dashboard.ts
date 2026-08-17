import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/authService/auth';
import { CreateBoardModal } from '../../components/create-board-modal/create-board-modal';
import { CommonModule } from '@angular/common';
import { BoardService } from '../../services/boardService/boardService';


@Component({
  selector: 'app-dashboard',
  imports: [RouterLink,CreateBoardModal,CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {

  constructor(
    private auth: Auth,
    private boardService:BoardService,
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
  onBoardCreated(createdBoard?: any){
    this.showCreateModal = false;
    if (createdBoard) {
      // add the new board to the beginning of the list for immediate UI update
      this.boards = [createdBoard, ...this.boards];
    } else {
      this.loadBoards();
    }
  }

  deleteBoard(id:any){
    this.boardService.deleteBoard(id).subscribe({
      next:(res:any)=>{
        this.loadBoards()
        console.log("Board delete Successfully",res);
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

  openBoard(id:string) {
    this.router.navigate(['/board',id]);
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