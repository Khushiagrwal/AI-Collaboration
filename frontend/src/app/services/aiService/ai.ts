import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environment/environment';

export interface UploadedDocument {
  documentId: string;
  name: string;
  characters: number;
  totalChunks: number;
  embeddedChunks: number;
  storedChunks: number;
  embeddingDimensions: number;
}

export interface DocumentUploadResponse {
  success: boolean;
  message: string;
  document: UploadedDocument;
}

export interface RetrievedDocumentChunk {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  text: string;
  score: number;
}

export interface DocumentRetrievalResponse {
  success: boolean;
  question: string;
  documentId: string;
  count: number;
  chunks: RetrievedDocumentChunk[];
}

export interface DocumentAnswerResponse {
  success: boolean;
  question: string;
  documentId: string;
  answer: string;
  sources: Array<{
    documentName?: string;
    chunkIndex?: number;
    score?: number;
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class Ai {
  private http = inject(HttpClient);
  private api = environment.BACKEND_URL;

  generateDiagram(prompt: string) {
    return this.http.post<{ result: unknown }>(`${this.api}/ai/generate-diagram`, { prompt });
  }

  uploadDocument(file: File, boardId: string) {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('boardId', boardId);
    return this.http.post<DocumentUploadResponse>(`${this.api}/documents/upload`, formData);
  }

  retrieveDocuments(question: string, documentId: string) {
    return this.http.post<DocumentRetrievalResponse>(`${this.api}/documents/retrieve`, {
      question,
      documentId
    });
  }

  answerDocumentQuestion(question: string, documentId: string) {
    return this.http.post<DocumentAnswerResponse>(`${this.api}/documents/answer`, {
      question,
      documentId
    });
  }
}
