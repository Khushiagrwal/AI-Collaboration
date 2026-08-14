import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { environment } from "../../../environment/environment";

@Injectable({providedIn:"root"})
export class BoardService {
    private http=inject(HttpClient);
    private api=environment.BACKEND_URL;

    getBoards(){
        return this.http.get(`${this.api}/board/`)
    }

    getBoard(id:any){
        return this.http.get(`${this.api}/board/${id}`)
    } 

    createBoard(data:any){
        console.log("oue")
        return this.http.post(`${this.api}/board/`,data)
    }

    updateBoard(data:any,id:any){
        return this.http.put(`${this.api}/board/${id}`, data)
    }

    deleteBoard(id:Number){
        return this.http.delete(`${this.api}/board/${id}`)
    }
}
