import { Injectable } from "@angular/core";
import { Socket, io } from "socket.io-client";
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
    const previousBoardId = this.currentBoardId;
    if (previousBoardId && previousBoardId !== boardId) {
        this.leaveBoard(previousBoardId);
    }
    this.currentBoardId = boardId;
    this.socket.emit('join-board', {
        boardId,
        token: localStorage.getItem('token')
    });
    }

    private currentBoardId: string | null = null;

    leaveBoard(boardId: string) {
    this.socket.emit('leave-board', boardId);
    if (this.currentBoardId === boardId) {
        this.currentBoardId = null;
    }
    }

    onBoardAccessError(callback: (message: string) => void) {
    this.socket.on('board-access-error', callback);
    return () => this.socket.off('board-access-error', callback);
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
    return () => this.socket.off('draw-start', callback);
    }

    onDraw(callback: (data: any) => void) {
    this.socket.on('draw', callback);
    return () => this.socket.off('draw', callback);
    }

    onDrawEnd(callback: (data: any) => void) {
    this.socket.on('draw-end', callback);
    return () => this.socket.off('draw-end', callback);
    }

    drawShape(data: any) {
    this.socket.emit('draw-shape', data);
    }

    onDrawShape(callback: (data: any) => void) {
    this.socket.on('draw-shape', callback);
    return () => this.socket.off('draw-shape', callback);
    }

    clearBoard(boardId: string) {
    this.socket.emit('clear-board', boardId);
    }

    onClearBoard(callback: () => void) {
    this.socket.on('clear-board', callback);
    return () => this.socket.off('clear-board', callback);
    }

    updateCursor(data: any) {
    this.socket.emit('cursor-move', data);
    }

    onCursorMove(callback: (data: any) => void) {
    this.socket.on('cursor-move', callback);
    return () => this.socket.off('cursor-move', callback);
    }

    leaveCursor(boardId: string) {
    this.socket.emit('cursor-leave', boardId);
    }

    onCursorLeave(callback: (data: any) => void) {
    this.socket.on('cursor-leave', callback);
    return () => this.socket.off('cursor-leave', callback);
    }

    sendAiDiagram(data: any) {
    this.socket.emit('ai-diagram', data);
    }

    onAiDiagram(callback: (data: any) => void) {
    this.socket.on('ai-diagram', callback);
    return () => this.socket.off('ai-diagram', callback);
    }

    
    
}
