import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environment/environment';

import { Ai } from './ai';

describe('Ai', () => {
  let service: Ai;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(Ai);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('sends diagram prompts to the existing diagram endpoint', () => {
    service.generateDiagram('Map a signup flow').subscribe();

    const request = httpTesting.expectOne(`${environment.BACKEND_URL}/ai/generate-diagram`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ prompt: 'Map a signup flow' });
    request.flush({ result: {} });
  });

  it('uploads documents using the backend multipart field name', () => {
    const file = new File(['Project notes'], 'notes.txt', { type: 'text/plain' });
    service.uploadDocument(file, 'board-1').subscribe();

    const request = httpTesting.expectOne(`${environment.BACKEND_URL}/documents/upload`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body instanceof FormData).toBe(true);
    expect((request.request.body as FormData).get('document')).toBe(file);
    expect((request.request.body as FormData).get('boardId')).toBe('board-1');
    request.flush({
      success: true,
      message: 'Document processed',
      document: { documentId: 'doc-1', name: 'notes.txt' }
    });
  });

  it('sends document questions with the existing retrieval payload', () => {
    service.retrieveDocuments('What is the deadline?', 'doc-1').subscribe();

    const request = httpTesting.expectOne(`${environment.BACKEND_URL}/documents/retrieve`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      question: 'What is the deadline?',
      documentId: 'doc-1'
    });
    request.flush({
      success: true,
      question: 'What is the deadline?',
      documentId: 'doc-1',
      count: 0,
      chunks: []
    });
  });

  it('sends document questions to the authenticated answer endpoint', () => {
    service.answerDocumentQuestion('What is the deadline?', 'doc-1').subscribe();

    const request = httpTesting.expectOne(`${environment.BACKEND_URL}/documents/answer`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      question: 'What is the deadline?',
      documentId: 'doc-1'
    });
    request.flush({
      success: true,
      question: 'What is the deadline?',
      documentId: 'doc-1',
      answer: 'Friday.',
      sources: []
    });
  });
});
