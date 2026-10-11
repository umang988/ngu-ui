import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';
import { provideNguUpload } from 'ngu-form/upload';

@Component({
  selector: 'demo-image-crop',
  imports: [NguForm],
  providers: [provideNguUpload()],
  template: `<ngu-form [form]="form" />`,
})
export class ImageCropDemo {
  readonly form = defineForm(
    { avatar: null as File | null },
    {
      // A square crop, scaled down to 256 pixels, saved as WebP.
      avatar: {
        label: 'Profile photo',
        type: 'image',
        crop: { aspect: 1 },
        maxWidth: 256,
        output: 'image/webp',
      },
    },
  );
}
