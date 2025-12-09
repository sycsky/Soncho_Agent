// Global notification service
type NotificationType = 'SUCCESS' | 'ERROR' | 'INFO';

class NotificationService {
  private listener: ((type: NotificationType, message: string) => void) | null = null;

  // Set the listener (called by App.tsx)
  setListener(listener: (type: NotificationType, message: string) => void) {
    this.listener = listener;
  }

  // Show notification
  show(type: NotificationType, message: string) {
    if (this.listener) {
      this.listener(type, message);
    } else {
      console.warn('NotificationService: No listener set, message:', message);
    }
  }

  success(message: string) {
    this.show('SUCCESS', message);
  }

  error(message: string) {
    this.show('ERROR', message);
  }

  info(message: string) {
    this.show('INFO', message);
  }
}

const notificationService = new NotificationService();
export default notificationService;
