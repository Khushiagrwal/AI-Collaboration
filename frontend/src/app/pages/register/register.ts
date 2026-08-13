import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Auth } from '../../services/authService/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {

  constructor(private auth:Auth,private router: Router){}
  registerForm = new FormGroup({

    name: new FormControl('', [
      Validators.required,
      Validators.minLength(3)
    ]),

    email: new FormControl('', [
      Validators.required,
      Validators.email
    ]),

    password: new FormControl('', [
      Validators.required,
      Validators.minLength(6)
    ]),

    confirmPassword: new FormControl('', [
      Validators.required
    ])

  });

  register() {

  if (this.registerForm.invalid) {
    this.registerForm.markAllAsTouched();
    return;
  }

  if (
    this.registerForm.value.password !==
    this.registerForm.value.confirmPassword
  ) {
    alert("Passwords do not match");
    return;
  }

  const user = {
    name: this.registerForm.value.name,
    email: this.registerForm.value.email,
    password: this.registerForm.value.password
  };

  this.auth.register(user).subscribe({
    next: (res) => {
      console.log(res);
      this.router.navigate(['dashboard'])
      alert("Registered Successfully");
    },
    error: (err) => {
      console.error(err);
      alert(err.error?.message || "Registration failed");
    }
  });
}

}