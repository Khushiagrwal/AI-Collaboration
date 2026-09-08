import { Component, EventEmitter, inject, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Ai } from '../../../services/aiService/ai';

@Component({
  selector: 'app-ai-panal-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './ai-panal-modal.html',
  styleUrl: './ai-panal-modal.css',
})
export class AiPanalModal {

  @Output() close = new EventEmitter<void>();
  @Output() diagramGenerated =new EventEmitter<any>();

  private aiService = inject(Ai);

  aiPrompt = '';
  aiLoading = false;
  aiError = '';

  closeModal(): void {
    this.close.emit();
  }

  generateDiagram(): void {

    if (!this.aiPrompt.trim()) {
      return;
    }

    this.aiLoading = true;
    this.aiError = '';

    this.aiService.generateDiagram(this.aiPrompt).subscribe({

      next: (response:any) => {
        console.log('AI response:', response);
        this.diagramGenerated.emit(response.result)
        this.aiLoading = false;
      },

      error: (error) => {
        console.error('AI error:', error);
        this.aiLoading = false;
        this.aiError = 'Failed to generate diagram. Please try again.';
      }

    });
  }
}