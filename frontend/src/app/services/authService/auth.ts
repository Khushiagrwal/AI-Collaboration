import { inject, Injectable, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment/environment';

@Injectable({
    providedIn:'root'
})
export class Auth {
    private http=inject(HttpClient);
    private api= environment.BACKEND_URL
  register(data:any){
    return this.http.post(`${this.api}/auth/register`, data);
  }

  login(data:any){
    return this.http.post(`${this.api}/auth/login`, data);
  }
  
  logout(){
    localStorage.removeItem('token');
  }
}
