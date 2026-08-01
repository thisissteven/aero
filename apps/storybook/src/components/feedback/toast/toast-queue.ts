import type { ReactNode } from 'react';

import type {
  ButtonProps,
  ToastContentValue,
  ToastQueueOptions,
} from '@aero/ui';

export { toast, ToastQueue, toastQueue } from '@aero/ui';
export type { ToastContentValue, ToastQueueOptions };

export interface AeroToastOptions {
  actionProps?: ButtonProps;
  description?: ReactNode;
  indicator?: ReactNode;
  timeout?: number;
  title?: ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning';
}
