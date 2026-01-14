// Global notification service
import { toast } from 'sonner';

type NotificationType = 'SUCCESS' | 'ERROR' | 'INFO';

class NotificationService {
  // Show notification using sonner
  show(type: NotificationType, message: string) {
    switch (type) {
      case 'SUCCESS':
        toast.success(message);
        break;
      case 'ERROR':
        toast.error(message);
        break;
      case 'INFO':
        toast.info(message);
        break;
      default:
        toast(message);
    }
  }

  // Deprecated: No longer needed as we use sonner directly
  setListener(listener: (type: NotificationType, message: string) => void) {
    console.warn('NotificationService.setListener is deprecated. We use sonner directly now.');
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
