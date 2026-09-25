import { en } from '@/app/hooks/i18n/locales/en';
import { BaseTranslation } from '@/app/hooks/i18n/locales/translations';

export type ApiErrorMessages = BaseTranslation['apiErrors'];
export type ApiErrorKey = keyof ApiErrorMessages;

type MessageFn<T> = T extends (...args: infer A) => string
  ? (...args: A) => string
  : () => string;

let messages: ApiErrorMessages = en.apiErrors;

export function setApiErrorMessages(next: ApiErrorMessages) {
  messages = next;
}

export function apiError<K extends ApiErrorKey>(
  key: K,
  ...args: Parameters<MessageFn<ApiErrorMessages[K]>>
): string {
  const value: ApiErrorMessages[K] = messages[key];

  if (typeof value === 'function') {
    const fn = value as (...params: never[]) => string;
    return fn(...(args as never[]));
  }

  return value as string;
}
