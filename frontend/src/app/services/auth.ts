import { inject, Injectable, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn:'root'
})
export class Auth {
    private http=inject(HttpClient);
    private api= "http://localhost:8080/api/auth";

  register(data:any){
    return this.http.post(`${this.api}/register`, data);
  }

  login(data:any){
    return this.http.post(`${this.api}/login`, data);
  }
  
  logout(){
    localStorage.removeItem('token');
  }
}
