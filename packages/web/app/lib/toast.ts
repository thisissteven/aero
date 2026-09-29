import { type ToastPromiseOptions, toast } from '@aero/ui';

/**
 * Runs a promise through `toast.promise` so the user sees a loading toast that
 * resolves into its success or error state.
 *
 * Returns a settled promise (it never rejects) that resolves to `true` on
 * success and `false` on failure, so callers can run follow-up state updates
 * without a `try`/`catch`.
 */
export function toastPromise<T>(
  promise: Promise<T>,
  options: ToastPromiseOptions<T>,
): Promise<boolean> {
  void toast.promise(promise, options);
  return promise.then(
    () => true,
    () => false,
  );
}
