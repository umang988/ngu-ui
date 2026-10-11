import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';
import { provideNguUpload } from 'ngu-form/upload';

@Component({
  selector: 'demo-file-upload-basic',
  imports: [NguForm],
  providers: [provideNguUpload()],
  template: `<ngu-form [form]="form" />`,
})
export class FileUploadBasicDemo {
  // Without an upload function, the value holds File objects.
  readonly form = defineForm(
    { attachments: [] as File[], cv: null as File | null },
    {
      attachments: {
        label: 'Attachments',
        type: 'file',
        accept: '.pdf,image/*',
        maxSize: 2_000_000,
        max: 3,
      },
      cv: { label: 'CV', type: 'file', accept: '.pdf' },
    },
  );
}
