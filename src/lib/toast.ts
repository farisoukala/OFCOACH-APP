import { toast as sonnerToast } from 'sonner';

/** Toasts OfCoach (remplace les `alert()` bloquants). */
export const toast = {
  success: (message: string, description?: string) =>
    sonnerToast.success(message, description ? { description } : undefined),
  error: (message: string, description?: string, duration?: number) =>
    sonnerToast.error(message, { ...(description ? { description } : {}), ...(duration ? { duration } : {}) }),
  warning: (message: string, description?: string) =>
    sonnerToast.warning(message, description ? { description } : undefined),
  info: (message: string, description?: string) =>
    sonnerToast.info(message, description ? { description } : undefined),
  message: (message: string, description?: string) =>
    sonnerToast.message(message, description ? { description } : undefined),
};
