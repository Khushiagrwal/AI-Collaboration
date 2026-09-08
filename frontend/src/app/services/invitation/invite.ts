import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class InvitationService {

  private http = inject(HttpClient);

  getInvitation(token: string) {
    return this.http.get(
      `${environment.BACKEND_URL}/invite/${token}`
    );
  }
  acceptInvitation(token: string) {
  return this.http.post(
    `${environment.BACKEND_URL}/invite/${token}/accept`,
    {}
  );
  }

  createInvitation(boardId: string, email: string, role: 'viewer' | 'editor') {
    return this.http.post(
      `${environment.BACKEND_URL}/invite/share`,
      { boardId, email, role }
    );
  }
}