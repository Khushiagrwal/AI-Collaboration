import { Component } from '@angular/core';
import { RouterLink,Router } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  constructor(private auth:Auth,private router:Router){}
  logout(){
    this.auth.logout();
    this.router.navigate([''])
  }
}
