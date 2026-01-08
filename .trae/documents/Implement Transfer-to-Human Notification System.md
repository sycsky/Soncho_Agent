# Implement Transfer-to-Human Notification System

## 1. State Management
- Define `TransferNotification` interface:
  ```typescript
  interface TransferNotification {
    sessionId: string;
    userName: string;
    avatar?: string;
    reason?: string;
    timestamp: number;
  }
  ```
- Add state to `App.tsx`: `const [transferNotifications, setTransferNotifications] = useState<TransferNotification[]>([]);`

## 2. WebSocket Event Handling
- Modify `handleWebSocketMessage` in `App.tsx`.
- In `case 'sessionUpdated'`:
  - Check if `sessionData.status === 'HUMAN_HANDLING'`.
  - Check if `sessionData.primaryAgentId === currentUser?.id`.
  - Check if the session is not already in the notification list.
  - If matched, add a new notification to `transferNotifications`.

## 3. UI Implementation
- Create a new Notification List component within `App.tsx` (positioned top-right, below or replacing standard toasts for these events).
- **Style**: Distinctive card style for transfer requests.
- **Content**: Show User Name, Avatar, and "Transfer Request".
- **Interaction**:
  - **Click Body**: Call `handleSelectSession(sessionId)` and remove the notification from the list.
  - **Click Close (X)**: Remove the notification from the list without navigating.
  - **Logic**: Ensure clicking an item removes only that item.

## 4. Verification
- Simulate a transfer event (or trigger one if possible) and verify the notification appears.
- Verify clicking the notification opens the chat and removes the notification.
- Verify manual close works.
