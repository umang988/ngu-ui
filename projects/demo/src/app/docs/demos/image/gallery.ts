import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';
import { provideNguUpload } from 'ngu-form/upload';

@Component({
  selector: 'demo-image-gallery',
  imports: [NguForm],
  providers: [provideNguUpload()],
  template: `<ngu-form [form]="form" />`,
})
export class ImageGalleryDemo {
  readonly form = defineForm(
    { photos: [] as File[] },
    {
      // No dialog: images are only scaled down, keeping their shape.
      photos: {
        label: 'Photos',
        type: 'image',
        crop: false,
        maxWidth: 1600,
        maxHeight: 1600,
        max: 6,
      },
    },
  );
}
