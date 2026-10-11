import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';
import { provideNguUpload, type NguUploadedFile, type NguUploadFn } from 'ngu-form/upload';

/** A pretend server: progress for about a second; files named "fail" fail. */
const upload: NguUploadFn = (file, { progress, signal }) =>
  new Promise((resolve, reject) => {
    let done = 0;
    const timer = setInterval(() => {
      progress((done += 0.25));
      if (done >= 1) {
        clearInterval(timer);
        if (file.name.includes('fail')) {
          reject(new Error('Refused'));
        } else {
          resolve({ name: file.name, size: file.size, type: file.type, id: crypto.randomUUID() });
        }
      }
    }, 250);
    signal.addEventListener('abort', () => clearInterval(timer));
  });

@Component({
  selector: 'demo-file-upload-upload',
  imports: [NguForm],
  providers: [provideNguUpload()],
  template: `<ngu-form [form]="form" submitLabel="Send" />`,
})
export class FileUploadUploadDemo {
  // With an upload function, the value holds what it returns.
  readonly form = defineForm(
    { documents: [] as NguUploadedFile[] },
    {
      documents: {
        label: 'Documents',
        type: 'file',
        upload,
        required: true,
        hint: 'A file named "fail" fails',
      },
    },
  );
}
