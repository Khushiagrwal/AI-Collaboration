import { Inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";

export const authGuard:CanActivateFn=()=>{
    const router =Inject(Router);
    if(localStorage.getItem("token")){
        return true;
    }
    router.navigate(['/']);
    return false;
}