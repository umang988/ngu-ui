import type { NguUploadFn } from 'ngu-form/upload';

/**
 * A pretend upload: reports progress for about a second, then returns a file record.
 * Files whose name contains "fail" fail, so the Retry button can be tried.
 */
export const fakeUpload: NguUploadFn = (file, { progress, signal }) =>
  new Promise((resolve, reject) => {
    let done = 0;
    const timer = setInterval(() => {
      done = Math.min(1, done + 0.2);
      progress(done);
      if (done < 1) {
        return;
      }
      clearInterval(timer);
      if (file.name.toLowerCase().includes('fail')) {
        reject(new Error('The server refused the file'));
      } else {
        resolve({ name: file.name, size: file.size, type: file.type, id: crypto.randomUUID() });
      }
    }, 220);
    signal.addEventListener('abort', () => {
      clearInterval(timer);
      reject(signal.reason);
    });
  });
