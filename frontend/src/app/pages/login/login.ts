import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../services/authService/auth';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  constructor(private auth:Auth,private router: Router){}

  loginForm= new FormGroup({
    email:new FormControl('',[Validators.required,Validators.email]),
    password:new FormControl('',[Validators.required,Validators.minLength(6)])
  })

  submit(){
    this.auth.login(this.loginForm.value).subscribe({
      next:(res:any)=>{
        console.log(res)
        localStorage.setItem("token",res.token)
        this.router.navigate(['dashboard'])
        alert("Login Successfully")
      },error:(err)=>{
        alert(err)
      }
    })
  }
}
