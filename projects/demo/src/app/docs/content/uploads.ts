import type { DocPage } from 'docs-kit/docs/model';

const SETUP = {
  id: 'setup',
  title: 'Setup',
  text: [
    'Uploads live in the `ngu-form/upload` entry point, so apps without them do not ship the code. Importing it also teaches TypeScript the `file`, `image` and `signature` types.',
  ],
  code: [
    {
      code: `import { provideNguUpload } from 'ngu-form/upload';\n\nproviders: [provideNguUpload()]`,
    },
  ],
};

export const PAGES: Record<string, DocPage> = {
  'file-upload': {
    title: 'File upload',
    description: 'Choose or drop files, check their type and size, and upload them with progress.',
    sections: [
      SETUP,
      {
        id: 'basic',
        title: 'Basic',
        text: [
          'On `File[]` the field takes several files; on `File | null`, one. A file of another type or over `maxSize` is refused with a message and blocks the submit until it is removed.',
        ],
        demo: {
          src: 'file-upload/basic.ts',
          load: () => import('../demos/file-upload/basic').then((m) => m.FileUploadBasicDemo),
        },
      },
      {
        id: 'upload',
        title: 'Uploading',
        text: [
          'With `upload`, each file uploads as soon as it is chosen and shows its progress; the value holds what `upload` returns. A submit waits for running uploads, and a failed one offers Retry. Removing a file, or resetting the form, aborts its upload.',
        ],
        demo: {
          src: 'file-upload/upload.ts',
          load: () => import('../demos/file-upload/upload').then((m) => m.FileUploadUploadDemo),
        },
      },
      {
        id: 'accessibility',
        title: 'Accessibility',
        list: [
          'The file input is labelled by the field and its "Choose files" button, and keyboard users reach it with Tab.',
          'Additions, removals and failed uploads are announced. Removing a file returns focus to the file button.',
          '`File` values are never saved in drafts; uploaded file records are.',
        ],
      },
    ],
    api: [
      {
        id: 'options',
        title: 'Options',
        text: 'On `File`, `File[]` and uploaded-file properties. `min` and `max` count files.',
        rows: [
          { name: 'type', type: "'file'", description: 'The field type.' },
          {
            name: 'accept',
            type: 'string',
            description:
              'Accepted types, as the `accept` attribute: `.pdf,image/*`. Dropped files are checked too.',
          },
          { name: 'maxSize', type: 'number', description: 'The largest file, in bytes.' },
          {
            name: 'upload',
            type: '(file, { progress, signal }) => Promise<NguUploadedFile>',
            description: 'Uploads each file; the value then holds the results.',
          },
          { name: 'min / max', type: 'number', description: 'How many files.' },
        ],
      },
      {
        id: 'uploaded-file',
        title: 'NguUploadedFile',
        rows: [
          { name: 'name', type: 'string', description: 'Shown in the list.' },
          { name: 'size', type: 'number', description: 'In bytes.' },
          { name: 'type', type: 'string', description: 'MIME type.' },
          {
            name: 'url',
            type: 'string',
            description: 'Where the file is; images with a `url` get a thumbnail.',
          },
          { name: 'id', type: 'string | number', description: "Your server's id." },
        ],
      },
    ],
  },

  image: {
    title: 'Image',
    description: 'An image field that crops and resizes before adding or uploading.',
    sections: [
      SETUP,
      {
        id: 'crop',
        title: 'Crop',
        text: [
          'Choosing an image opens a crop dialog. `crop: { aspect: 1 }` crops a square; people drag the image or use the zoom and position sliders. Escape cancels.',
        ],
        demo: {
          src: 'image/crop.ts',
          load: () => import('../demos/image/crop').then((m) => m.ImageCropDemo),
        },
      },
      {
        id: 'resize',
        title: 'Resize only',
        text: [
          '`crop: false` skips the dialog; `maxWidth` and `maxHeight` still scale large images down.',
        ],
        demo: {
          src: 'image/gallery.ts',
          load: () => import('../demos/image/gallery').then((m) => m.ImageGalleryDemo),
        },
      },
      {
        id: 'accessibility',
        title: 'Accessibility',
        list: [
          'The crop dialog is a native modal `<dialog>`: focus stays inside, Escape cancels, and focus returns afterwards.',
          'Zoom and position are sliders, so cropping works with a keyboard alone.',
        ],
      },
    ],
    api: [
      {
        id: 'options',
        title: 'Options',
        text: 'Everything a [file field](/file-upload) takes, plus:',
        rows: [
          {
            name: 'type',
            type: "'image'",
            description: 'The field type. `accept` defaults to `image/*`.',
          },
          {
            name: 'crop',
            type: 'boolean | { aspect?: number }',
            default: 'true',
            description: "Open the crop dialog, with a fixed shape or the image's own.",
          },
          {
            name: 'maxWidth / maxHeight',
            type: 'number',
            description: 'Larger images are scaled down.',
          },
          {
            name: 'output',
            type: "'image/jpeg' | 'image/png' | 'image/webp'",
            description: 'Output format. PNG stays PNG; anything else becomes JPEG.',
          },
          { name: 'quality', type: 'number', default: '0.9', description: 'For JPEG and WebP.' },
        ],
      },
    ],
  },

  signature: {
    title: 'Signature',
    description:
      'A signature drawn with a mouse, finger or pen, or typed, stored as a PNG data URL.',
    sections: [
      SETUP,
      {
        id: 'basic',
        title: 'Basic',
        text: [
          'The value is a PNG data URL, or `\'\'` while unsigned. "Type instead" draws the typed name in a handwriting font.',
        ],
        demo: {
          src: 'signature/basic.ts',
          load: () => import('../demos/signature/basic').then((m) => m.SignatureBasicDemo),
        },
      },
      {
        id: 'accessibility',
        title: 'Accessibility',
        list: [
          '"Type instead" lets people sign without a pointer.',
          'The pad is an image named "Signature", and says when it is signed.',
        ],
      },
    ],
    api: [
      {
        id: 'options',
        title: 'Options',
        rows: [
          { name: 'type', type: "'signature'", description: 'On `string` properties.' },
          { name: 'penColor', type: 'string', description: 'Defaults to the text color.' },
          {
            name: 'height',
            type: 'number',
            default: '160',
            description: 'The pad height in CSS pixels.',
          },
        ],
      },
    ],
  },
};
