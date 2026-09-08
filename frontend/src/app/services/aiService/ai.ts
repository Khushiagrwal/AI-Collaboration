import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environment/environment';

@Injectable({
  providedIn: 'root',
})
export class Ai {
  private http = inject(HttpClient);
  private api = environment.BACKEND_URL;

  generateDiagram(prompt: string) {
    return this.http.post(`${this.api}/ai/generate-diagram`, { prompt });
  }
}

