import type { NguTableAsync, NguTableSubscribable } from './types';

function isSubscribable<R>(source: NguTableAsync<R>): source is NguTableSubscribable<R> {
  return typeof (source as NguTableSubscribable<R>)?.subscribe === 'function';
}

/** Subscribes to an Observable or waits for a Promise. Returns the cancel function. */
export function consume<R>(
  source: NguTableAsync<R>,
  handlers: { next(value: R): void; error(error: unknown): void; complete(): void },
): () => void {
  let done = false;

  if (isSubscribable(source)) {
    const sub = source.subscribe({
      next: (value) => !done && handlers.next(value),
      error: (error) => {
        if (done) return;
        done = true;
        handlers.error(error);
      },
      complete: () => {
        if (done) return;
        done = true;
        handlers.complete();
      },
    });
    return () => {
      done = true;
      sub.unsubscribe();
    };
  }

  Promise.resolve(source).then(
    (value) => {
      if (done) return;
      handlers.next(value);
      done = true;
      handlers.complete();
    },
    (error) => {
      if (done) return;
      done = true;
      handlers.error(error);
    },
  );
  return () => (done = true);
}
