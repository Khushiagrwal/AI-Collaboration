import { Injectable } from "@angular/core";
import { Socket,io } from "socket.io-client";

@Injectable({
    providedIn:'root'
})
export class SocketService {
    private socket:Socket;

    constructor() {
    this.socket = io('http://localhost:8080');
    }

    joinBoard(boardId: string) {
    this.socket.emit('join-board', boardId);
    }
    sendDrawing(data: any) {
    this.socket.emit('draw', data);
    }

    onDrawing(callback: (data:any)=>void) {// not understood
    this.socket.on('draw', callback);
    }
}
