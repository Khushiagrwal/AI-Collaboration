import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info';

export interface AppNotification {
  id: number;
  type: NotificationType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly notifications = signal<AppNotification[]>([]);
  private nextId = 0;

  show(message: string, type: NotificationType = 'info', duration = 4500): void {
    const notification = { id: ++this.nextId, type, message };
    this.notifications.update(items => [...items, notification]);

    window.setTimeout(() => this.dismiss(notification.id), duration);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  dismiss(id: number): void {
    this.notifications.update(items => items.filter(item => item.id !== id));
  }
}
