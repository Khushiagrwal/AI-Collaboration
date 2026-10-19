import { ChangeDetectorRef, Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/authService/auth';
import { CreateBoardModal } from '../../components/create-board-modal/create-board-modal';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BoardService } from '../../services/boardService/boardService';
import { NotificationService } from '../../services/notification.service';


@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, CreateBoardModal, CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {

  constructor(
    private auth: Auth,
    private boardService:BoardService,
    private router: Router,
    private notifications: NotificationService,
    private changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(){
    this.loadBoards();
  }

  activeTab: string = 'dashboard';
  boards:any[]=[]
  currentUser: any = null;
  searchQuery = '';
  boardFilter: 'all' | 'owned' | 'shared' = 'all';
  isLoading = false;
  loadError = false;

  get ownedBoards() {
    return this.boards.filter(board => board.isOwner);
  }

  get sharedBoards() {
    return this.boards.filter(board => !board.isOwner);
  }

  get filteredBoards() {
    const query = this.searchQuery.trim().toLocaleLowerCase();
    return this.boards
      .filter(board => {
        if (this.boardFilter === 'owned') return board.isOwner;
        if (this.boardFilter === 'shared') return !board.isOwner;
        return true;
      })
      .filter(board => !query || String(board.title ?? '').toLocaleLowerCase().includes(query))
      .sort((first, second) =>
        new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
      );
  }

  loadBoards(){
    this.isLoading = true;
    this.loadError = false;
    this.boardService.getBoards().subscribe({
      next:(res:any)=>{
        this.boards=res.boards ?? [];
        this.currentUser = res.currentUser ?? null;
        this.isLoading = false;
        this.changeDetector.markForCheck();
      },error:(err:any)=>{
        this.isLoading = false;
        this.loadError = true;
        this.changeDetector.markForCheck();
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
        this.boards = this.boards.filter(board => board._id !== id);
        this.changeDetector.markForCheck();
        this.notifications.success('Board deleted successfully');
      },
      error:(err:any)=>{
        this.changeDetector.markForCheck();
        this.notifications.error(err.error?.message || err.message || 'Could not delete board');
      }
    })
  }

  get recentBoards() {
    return this.filteredBoards
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

}