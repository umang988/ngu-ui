import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  formatBytes,
  matchesAccept,
  provideNguUpload,
  type NguUploadedFile,
  type NguUploadFn,
} from 'ngu-form/upload';
import { NguForm } from './components/ngu-form';
import { defineForm } from './define';

function pick(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

const text = (name: string, size = 1200, type = 'text/plain') =>
  new File(['x'.repeat(size)], name, { type });

/** Lets the async pick → check → add chain finish. */
async function settle(fixture: ComponentFixture<unknown>) {
  for (let i = 0; i < 3; i++) {
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
  }
}

describe('upload helpers', () => {
  it('matches accept lists by extension, wildcard and exact type', () => {
    expect(matchesAccept({ name: 'a.PDF', type: 'application/pdf' }, '.pdf')).toBe(true);
    expect(matchesAccept({ name: 'a.png', type: 'image/png' }, 'image/*')).toBe(true);
    expect(matchesAccept({ name: 'a.txt', type: 'text/plain' }, 'image/*, .pdf')).toBe(false);
    expect(matchesAccept({ name: 'a.txt', type: 'text/plain' }, undefined)).toBe(true);
    expect(formatBytes(1200, 'en-US')).toBe('1.2 kB');
    expect(formatBytes(5_000_000, 'en-US')).toBe('5 MB');
    expect(formatBytes(12, 'en-US')).toBe('12 bytes');
  });
});

describe('file fields without an upload function', () => {
  @Component({
    selector: 'upload-host-1',
    imports: [NguForm],
    providers: [provideNguUpload()],
    template: `<ngu-form [form]="form" [action]="save" submitLabel="Send" />`,
  })
  class Host {
    sent: unknown;
    readonly save = (value: unknown) => {
      this.sent = value;
      return undefined;
    };
    readonly form = defineForm(
      { files: [] as File[], cv: null as File | null },
      {
        files: {
          label: 'Attachments',
          type: 'file',
          accept: '.txt,.pdf',
          maxSize: 2000,
          max: 3,
          required: true,
        },
        cv: { label: 'CV', type: 'file' },
      },
    );
  }

  let fixture: ComponentFixture<Host>;
  let el: HTMLElement;
  let host: Host;
  const field = (label: string) =>
    Array.from(el.querySelectorAll('ngu-field')).find((f) =>
      f.querySelector('.ngu-label')?.textContent?.startsWith(label),
    )!;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    el = fixture.nativeElement;
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('renders a labelled file button and drop zone', () => {
    const input = field('Attachments').querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(input.multiple).toBe(true);
    expect(input.accept).toBe('.txt,.pdf');
    const labels = Array.from(el.querySelectorAll(`label[for="${input.id}"]`)).map((l) =>
      l.textContent?.trim(),
    );
    expect(labels).toEqual(['Attachments*', 'Choose files']);
    expect(field('CV').querySelector<HTMLInputElement>('input[type="file"]')!.multiple).toBe(false);
    expect(field('CV').querySelector('.ngu-drop__button')?.textContent?.trim()).toBe(
      'Choose a file',
    );
  });

  it('adds chosen files to the value and lists them', async () => {
    const input = field('Attachments').querySelector<HTMLInputElement>('input[type="file"]')!;
    pick(input, [text('a.txt'), text('b.pdf', 900, 'application/pdf')]);
    await settle(fixture);
    expect(host.form.value().files.map((f) => f.name)).toEqual(['a.txt', 'b.pdf']);
    const rows = Array.from(field('Attachments').querySelectorAll('.ngu-file'));
    expect(rows.map((r) => r.querySelector('.ngu-file__name')?.textContent)).toEqual([
      'a.txt',
      'b.pdf',
    ]);
    expect(rows[0].querySelector('.ngu-file__meta')?.textContent?.trim()).toBe('1.2 kB');
    expect(field('Attachments').querySelector('[aria-live]')?.textContent).toBe('2 files added');

    rows[0].querySelector<HTMLButtonElement>('button[aria-label="Remove a.txt"]')!.click();
    await fixture.whenStable();
    expect(host.form.value().files.map((f) => f.name)).toEqual(['b.pdf']);
    expect(document.activeElement).toBe(input);
  });

  it('refuses files of the wrong type or size, and blocks the submit until they are removed', async () => {
    const input = field('Attachments').querySelector<HTMLInputElement>('input[type="file"]')!;
    pick(input, [
      text('ok.txt'),
      text('virus.exe', 10, 'application/x-msdownload'),
      text('big.txt', 5000),
    ]);
    await settle(fixture);
    expect(host.form.value().files.map((f) => f.name)).toEqual(['ok.txt']);
    const problems = Array.from(
      field('Attachments').querySelectorAll('.ngu-file--problem .ngu-file__meta'),
    ).map((m) => m.textContent?.trim());
    expect(problems).toEqual([
      'virus.exe is not an accepted file type',
      'big.txt is larger than 2 kB',
    ]);

    el.querySelector<HTMLButtonElement>('.ngu-submit')!.click();
    await settle(fixture);
    expect(host.sent).toBeUndefined();
    expect(field('Attachments').querySelector('.ngu-error')?.textContent?.trim()).toBe(
      'virus.exe is not an accepted file type',
    );

    for (const name of ['virus.exe', 'big.txt']) {
      field('Attachments')
        .querySelector<HTMLButtonElement>(`button[aria-label="Remove ${name}"]`)!
        .click();
      await fixture.whenStable();
    }
    el.querySelector<HTMLButtonElement>('.ngu-submit')!.click();
    await settle(fixture);
    expect((host.sent as { files: File[] }).files.map((f) => f.name)).toEqual(['ok.txt']);
  });

  it('counts files against min and max, and replaces a single file', async () => {
    const input = field('Attachments').querySelector<HTMLInputElement>('input[type="file"]')!;
    pick(input, [text('1.txt'), text('2.txt'), text('3.txt'), text('4.txt')]);
    await settle(fixture);
    expect((host.form.tree as any).files().errors()[0]?.kind).toBe('maxItems');

    const cv = field('CV').querySelector<HTMLInputElement>('input[type="file"]')!;
    pick(cv, [text('old.pdf', 10, 'application/pdf')]);
    await settle(fixture);
    pick(cv, [text('new.pdf', 10, 'application/pdf')]);
    await settle(fixture);
    expect(host.form.value().cv?.name).toBe('new.pdf');
    expect(field('CV').querySelectorAll('.ngu-file')).toHaveLength(1);
  });

  it('accepts dropped files', async () => {
    const zone = field('CV').querySelector<HTMLElement>('.ngu-drop')!;
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', {
      value: { files: [text('dropped.txt')], types: ['Files'] },
    });
    zone.dispatchEvent(drop);
    await settle(fixture);
    expect(drop.defaultPrevented).toBe(true);
    expect(host.form.value().cv?.name).toBe('dropped.txt');
  });
});

describe('file fields with an upload function', () => {
  const calls: {
    file: File;
    progress: (n: number) => void;
    signal: AbortSignal;
    done: (r: NguUploadedFile) => void;
    fail: () => void;
  }[] = [];
  const upload: NguUploadFn = (file, { progress, signal }) =>
    new Promise((done, fail) =>
      calls.push({ file, progress, signal, done, fail: () => fail(new Error('500')) }),
    );

  @Component({
    selector: 'upload-host-2',
    imports: [NguForm],
    providers: [provideNguUpload()],
    template: `<ngu-form [form]="form" [action]="save" submitLabel="Send" />`,
  })
  class Host {
    sent: { docs: NguUploadedFile[] } | undefined;
    readonly save = (value: { docs: NguUploadedFile[] }) => {
      this.sent = value;
      return undefined;
    };
    readonly form = defineForm(
      { docs: [] as NguUploadedFile[] },
      { docs: { label: 'Documents', type: 'file', upload } },
    );
  }

  let fixture: ComponentFixture<Host>;
  let el: HTMLElement;
  let host: Host;
  const input = () => el.querySelector<HTMLInputElement>('input[type="file"]')!;

  beforeEach(async () => {
    calls.length = 0;
    fixture = TestBed.createComponent(Host);
    el = fixture.nativeElement;
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('shows progress, then stores what the server returned', async () => {
    pick(input(), [text('report.pdf', 10, 'application/pdf')]);
    await settle(fixture);
    expect(calls).toHaveLength(1);
    calls[0].progress(0.5);
    await fixture.whenStable();
    expect(el.querySelector('.ngu-file__meta')?.textContent?.trim()).toBe('Uploading, 50%');
    expect(host.form.value().docs).toEqual([]);
    calls[0].done({ name: 'report.pdf', id: 7, url: '/files/7' });
    await settle(fixture);
    expect(host.form.value().docs).toMatchObject([{ name: 'report.pdf', id: 7, url: '/files/7' }]);
  });

  it('waits for running uploads before it submits', async () => {
    pick(input(), [text('a.txt')]);
    await settle(fixture);
    el.querySelector<HTMLButtonElement>('.ngu-submit')!.click();
    await settle(fixture);
    expect(host.sent).toBeUndefined();
    expect(el.querySelector('.ngu-submit')?.getAttribute('aria-disabled')).toBe('true');
    calls[0].done({ name: 'a.txt', id: 1 });
    await settle(fixture);
    expect(host.sent?.docs).toMatchObject([{ name: 'a.txt', id: 1 }]);
  });

  it('reports failed uploads, which block the submit until retried or removed', async () => {
    pick(input(), [text('a.txt')]);
    await settle(fixture);
    calls[0].fail();
    await settle(fixture);
    expect(el.querySelector('.ngu-file__meta')?.textContent?.trim()).toBe('Upload failed');
    el.querySelector<HTMLButtonElement>('.ngu-submit')!.click();
    await settle(fixture);
    expect(host.sent).toBeUndefined();
    expect(el.querySelector('.ngu-error')?.textContent?.trim()).toBe(
      'A file was not uploaded. Retry or remove it.',
    );

    Array.from(el.querySelectorAll<HTMLButtonElement>('.ngu-file__action'))
      .find((b) => b.textContent?.trim() === 'Retry')!
      .click();
    await settle(fixture);
    expect(calls).toHaveLength(2);
    calls[1].done({ name: 'a.txt', id: 2 });
    await settle(fixture);
    expect(el.querySelector('.ngu-error')).toBeNull();
    expect(host.form.value().docs).toMatchObject([{ name: 'a.txt', id: 2 }]);
  });

  it('stops uploads when the file is removed or the form resets', async () => {
    pick(input(), [text('a.txt'), text('b.txt')]);
    await settle(fixture);
    el.querySelector<HTMLButtonElement>('button[aria-label="Remove a.txt"]')!.click();
    await fixture.whenStable();
    expect(calls[0].signal.aborted).toBe(true);
    host.form.reset();
    await fixture.whenStable();
    expect(calls[1].signal.aborted).toBe(true);
    expect(el.querySelectorAll('.ngu-file')).toHaveLength(0);
  });
});

describe('image and signature fields', () => {
  @Component({
    selector: 'upload-host-3',
    imports: [NguForm],
    providers: [provideNguUpload()],
    template: `<ngu-form [form]="form" submitLabel="Send" />`,
  })
  class Host {
    readonly form = defineForm(
      { photo: null as File | null, sign: '' },
      {
        photo: { label: 'Photo', type: 'image', crop: false },
        sign: { label: 'Signature', type: 'signature', required: true },
      },
    );
  }

  let fixture: ComponentFixture<Host>;
  let el: HTMLElement;
  let host: Host;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Host);
    el = fixture.nativeElement;
    host = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('takes images only by default', async () => {
    const input = el.querySelector<HTMLInputElement>('ngu-image-upload input[type="file"]')!;
    expect(input.accept).toBe('image/*');
    pick(input, [text('notes.txt')]);
    await settle(fixture);
    expect(host.form.value().photo).toBeNull();
    pick(input, [new File(['png'], 'me.png', { type: 'image/png' })]);
    await settle(fixture);
    expect(host.form.value().photo?.name).toBe('me.png');
  });

  it('offers a typed signature for keyboard users', async () => {
    const pad = el.querySelector<HTMLCanvasElement>('ngu-signature-pad canvas')!;
    expect(pad.getAttribute('role')).toBe('img');
    expect(pad.getAttribute('aria-label')).toBe('Signature. Draw with a mouse, finger or pen.');
    const [toggle, clear] = Array.from(
      el.querySelectorAll<HTMLButtonElement>('.ngu-signature__button'),
    );
    expect(clear.disabled).toBe(true);
    toggle.click();
    await fixture.whenStable();
    const name = el.querySelector<HTMLInputElement>('.ngu-signature__name')!;
    expect(name.id).toBe(
      name.closest('ngu-field')!.querySelector('label.ngu-label')?.getAttribute('for'),
    );
    expect(toggle.textContent?.trim()).toBe('Draw instead');
    expect(document.activeElement).toBe(name);
  });
});
