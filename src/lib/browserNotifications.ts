/** API Notifications du navigateur (hors onglet actif ; nécessite HTTPS sauf localhost). */

export type BrowserNotifyPermission = NotificationPermission | 'unsupported';

export function getBrowserNotificationSupport(): BrowserNotifyPermission {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotifyPermission> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    const r = await Notification.requestPermission();
    return r;
  } catch {
    return Notification.permission;
  }
}

export function showBrowserNotification(title: string, options?: NotificationOptions) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { ...options, silent: false });
  } catch {
    /* ignore */
  }
}
