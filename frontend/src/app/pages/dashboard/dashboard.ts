import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/authService/auth';
import { CreateBoardModal } from '../../components/create-board-modal/create-board-modal';
import { CommonModule } from '@angular/common';
import { BoardService } from '../../services/boardService/boardService';
import { NotificationService } from '../../services/notification.service';


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
    private router: Router,
    private notifications: NotificationService
  ) {}

  ngOnInit(){
    this.loadBoards();
  }

  activeTab: string = 'dashboard';
  boards:any[]=[]
  currentUser: any = null;

  get ownedBoards() {
    return this.boards.filter(board => board.isOwner);
  }

  get sharedBoards() {
    return this.boards.filter(board => !board.isOwner);
  }

  loadBoards(){
    this.boardService.getBoards().subscribe({
      next:(res:any)=>{
        this.boards=res.boards ?? [];
        this.currentUser = res.currentUser ?? null;
        console.log("Successfully loads",res.boards)
      },error:(err:any)=>{
        this.notifications.error(err.error?.message || err.message || 'Could not load boards');
      }
    })
  }
  onBoardCreated(createdBoard?: any){
    this.showCreateModal = false;
    if (createdBoard) {
      // add the new board to the beginning of the list for immediate UI update
      this.boards = [{ ...createdBoard, isOwner: true }, ...this.boards];
    } else {
      this.loadBoards();
    }
  }

  deleteBoard(id:any){
    this.boardService.deleteBoard(id).subscribe({
      next:(res:any)=>{
        this.loadBoards()
        this.notifications.success('Board deleted successfully');
      },
      error:(err:any)=>{
        this.notifications.error(err.error?.message || err.message || 'Could not delete board');
      }
    })
  }

  get totalMembers() {
    const memberIds = this.boards.flatMap(board => [
      board.owner?._id,
      ...(board.participants ?? []).map((participant: any) => participant._id)
    ]);
    return new Set(memberIds.filter(Boolean).map(String)).size;
  }

  get recentBoards() {
    return [...this.boards]
      .sort((first, second) =>
        new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
      )
      .slice(0, 4);
  }

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