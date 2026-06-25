import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { UiFeedbackService } from '../core/ui-feedback.service';

@Component({
  selector: 'app-feedback-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="toast-region" aria-live="polite" aria-label="Application status messages">
      @for (toast of feedback.toasts(); track toast.id) {
        <article class="toast" [class.toast-success]="toast.kind === 'success'" [class.toast-error]="toast.kind === 'error'">
          <div>
            <strong>{{ toast.title }}</strong>
            @if (toast.detail) {
              <p>{{ toast.detail }}</p>
            }
          </div>
          <button type="button" aria-label="Dismiss message" (click)="feedback.dismiss(toast.id)">x</button>
        </article>
      }
    </section>
  `,
})
export class FeedbackToastComponent {
  readonly feedback = inject(UiFeedbackService);
}
