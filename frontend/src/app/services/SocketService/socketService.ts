import { Injectable } from "@angular/core";
import { Socket,io } from "socket.io-client";
import { environment } from "../../../environment/environment";

@Injectable({
    providedIn:'root'
})
export class SocketService {
    private socket:Socket;
    private api=environment.BACKEND_URL.replace("/api", "");

    constructor() {
    this.socket = io(this.api);
    }

    joinBoard(boardId: string) {
    this.socket.emit('join-board', boardId);
    }

    drawStart(data: any) {
    this.socket.emit('draw-start', data);
    }

    draw(data: any) {
    this.socket.emit('draw', data);
    }

    drawEnd(data: any) {
    this.socket.emit('draw-end', data);
    }

    onDrawStart(callback: (data: any) => void) {
    this.socket.on('draw-start', callback);
    }

    onDraw(callback: (data: any) => void) {
    this.socket.on('draw', callback);
    }

    onDrawEnd(callback: (data: any) => void) {
    this.socket.on('draw-end', callback);
    }

    drawShape(data: any) {
    this.socket.emit('draw-shape', data);
    }

    onDrawShape(callback: (data: any) => void) {
    this.socket.on('draw-shape', callback);
    }

    clearBoard(boardId: string) {
    this.socket.emit('clear-board', boardId);
    }

    onClearBoard(callback: () => void) {
    this.socket.on('clear-board', callback);
    }
    
}
