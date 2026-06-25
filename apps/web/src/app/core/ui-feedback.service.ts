import { Injectable, computed, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export type ToastMessage = {
  id: number;
  kind: ToastKind;
  title: string;
  detail?: string;
};

@Injectable({ providedIn: 'root' })
export class UiFeedbackService {
  private nextToastId = 1;
  private readonly pendingRequests = signal(0);
  private readonly pendingMutations = signal(0);
  private readonly toastState = signal<ToastMessage[]>([]);

  readonly isBusy = computed(() => this.pendingRequests() > 0);
  readonly isSaving = computed(() => this.pendingMutations() > 0);
  readonly statusText = computed(() => {
    if (this.pendingMutations() > 0) return 'Saving changes...';
    if (this.pendingRequests() > 0) return 'Loading...';
    return '';
  });
  readonly toasts = this.toastState.asReadonly();

  begin(isMutation: boolean) {
    this.pendingRequests.update((count) => count + 1);
    if (isMutation) {
      this.pendingMutations.update((count) => count + 1);
    }
  }

  end(isMutation: boolean) {
    this.pendingRequests.update((count) => Math.max(count - 1, 0));
    if (isMutation) {
      this.pendingMutations.update((count) => Math.max(count - 1, 0));
    }
  }

  success(title: string, detail?: string) {
    this.push({ kind: 'success', title, detail });
  }

  error(title: string, detail?: string) {
    this.push({ kind: 'error', title, detail });
  }

  info(title: string, detail?: string) {
    this.push({ kind: 'info', title, detail });
  }

  dismiss(id: number) {
    this.toastState.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  private push(message: Omit<ToastMessage, 'id'>) {
    const id = this.nextToastId++;
    this.toastState.update((toasts) => [...toasts, { ...message, id }].slice(-4));
    window.setTimeout(() => this.dismiss(id), message.kind === 'error' ? 7000 : 4200);
  }
}
