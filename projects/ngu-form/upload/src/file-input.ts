import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { transformedValue } from '@angular/forms/signals';
import { injectNguI18n, NguFormContext, type LeafDef } from 'ngu-form';
import { NguImageCropper } from './cropper';
import { asList, formatBytes, isFile, isImage, matchesAccept } from './files';
import { processImage } from './image';
import type { NguFileValue, NguImageOptions } from './types';

type Status = 'done' | 'uploading' | 'failed' | 'rejected';

interface Row {
  readonly key: number;
  readonly name: string;
  readonly size?: number;
  readonly status: Status;
  /** Upload progress from 0 to 1. */
  readonly progress: number;
  /** Why a file failed or was refused, already translated. */
  readonly error?: string;
  /** The value item of a finished file. */
  readonly value?: NguFileValue;
  /** The file to upload again, for failed uploads. */
  readonly file?: File;
  readonly preview?: string;
}

let nextKey = 0;

/**
 * The control behind `type: 'file'` and `type: 'image'`: a file button and drop zone, and a
 * list of files with thumbnails, upload progress, Retry and Remove. Finished files are the
 * value. Uploads that failed and files that were refused (wrong type, too large) reach the
 * field as Signal Forms parse errors, so they block a submit until the user deals with them;
 * running uploads make `<ngu-form>` wait before it submits.
 */
@Component({
  selector: 'ngu-file-input',
  imports: [NguImageCropper],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ngu-file-input' },
  template: `
    <div
      class="ngu-drop"
      [class.ngu-drop--over]="dragging()"
      [class.ngu-drop--off]="locked()"
      [class.ngu-drop--invalid]="errorShown()"
      (dragenter)="onDragOver($event)"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <input
        #picker
        type="file"
        class="ngu-sr-only"
        [id]="id()"
        [attr.accept]="def().accept ?? null"
        [multiple]="multiple()"
        [disabled]="locked()"
        [attr.required]="required() ? '' : null"
        [attr.aria-invalid]="errorShown() ? 'true' : null"
        [attr.aria-describedby]="describedBy() ?? null"
        (change)="onPick($event)"
        (blur)="touch.emit()"
      />
      <label class="ngu-drop__button" [for]="id()">{{
        i18n.message(multiple() ? 'chooseFiles' : 'chooseFile')
      }}</label>
      <span class="ngu-drop__hint" aria-hidden="true">{{
        i18n.message('dropHint', { multiple: multiple() })
      }}</span>
    </div>
    @if (rows().length) {
      <ul class="ngu-files">
        @for (row of rows(); track row.key) {
          <li
            class="ngu-file"
            [class.ngu-file--problem]="row.status === 'failed' || row.status === 'rejected'"
          >
            @if (row.preview) {
              <img class="ngu-file__thumb" [src]="row.preview" alt="" />
            } @else {
              <span class="ngu-file__thumb ngu-file__thumb--blank" aria-hidden="true"></span>
            }
            <span class="ngu-file__body">
              <span class="ngu-file__name">{{ row.name }}</span>
              <span class="ngu-file__meta">
                @switch (row.status) {
                  @case ('uploading') {
                    {{ i18n.message('uploading', { percent: percent(row) }) }}
                  }
                  @case ('done') {
                    {{ size(row) }}
                  }
                  @default {
                    {{ row.error }}
                  }
                }
              </span>
              @if (row.status === 'uploading') {
                <span class="ngu-file__bar" aria-hidden="true"
                  ><span [style.inline-size.%]="percent(row)"></span
                ></span>
              }
            </span>
            @if (row.status === 'failed' && !locked()) {
              <button type="button" class="ngu-file__action" (click)="retry(row)">
                {{ i18n.message('retryUpload') }}
              </button>
            }
            @if (!locked()) {
              <button
                type="button"
                class="ngu-file__action ngu-file__remove"
                [attr.aria-label]="i18n.message('removeFile', { name: row.name })"
                (click)="remove(row)"
              >
                <span aria-hidden="true">×</span>
              </button>
            }
          </li>
        }
      </ul>
    }
    <span class="ngu-sr-only" aria-live="polite">{{ status() }}</span>
    @if (mode() === 'image') {
      <ngu-image-cropper [i18n]="i18n" />
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-inline-size: 0;
    }
    .ngu-drop {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 0.75rem;
      padding: 1rem;
      border: 1px dashed var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
      background: var(--ngu-input-bg, transparent);
    }
    .ngu-drop--over {
      border-style: solid;
      border-color: var(--ngu-primary, #1a73e8);
      background: var(--ngu-drop-bg, rgba(26, 115, 232, 0.08));
    }
    .ngu-drop--invalid {
      border-color: var(--ngu-error-color, #c62828);
    }
    .ngu-drop__button {
      display: inline-flex;
      align-items: center;
      padding: 0.4375rem 0.875rem;
      border: 1px solid var(--ngu-primary, #1a73e8);
      border-radius: var(--ngu-radius, 0.375rem);
      color: var(--ngu-primary, #1a73e8);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
    }
    .ngu-drop--off .ngu-drop__button {
      opacity: 0.6;
      cursor: default;
    }
    .ngu-drop:has(input:focus-visible) .ngu-drop__button {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 2px;
    }
    .ngu-drop__hint {
      font-size: 0.875rem;
      color: var(--ngu-hint-color, #6b6b6b);
    }
    .ngu-files {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .ngu-file {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
      min-inline-size: 0;
    }
    .ngu-file--problem {
      border-color: var(--ngu-error-color, #c62828);
    }
    .ngu-file__thumb {
      flex: none;
      inline-size: 2.5rem;
      block-size: 2.5rem;
      border-radius: calc(var(--ngu-radius, 0.375rem) / 2);
      object-fit: cover;
    }
    .ngu-file__thumb--blank {
      background: var(--ngu-skeleton-color, rgba(127, 127, 127, 0.16));
    }
    .ngu-file__body {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      flex: 1 1 auto;
      min-inline-size: 0;
    }
    .ngu-file__name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .ngu-file__meta {
      font-size: 0.8125rem;
      color: var(--ngu-hint-color, #6b6b6b);
    }
    .ngu-file--problem .ngu-file__meta {
      color: var(--ngu-error-color, #c62828);
    }
    .ngu-file__bar {
      display: block;
      block-size: 0.25rem;
      border-radius: 999px;
      background: var(--ngu-skeleton-color, rgba(127, 127, 127, 0.16));
      overflow: hidden;
    }
    .ngu-file__bar > span {
      display: block;
      block-size: 100%;
      background: var(--ngu-primary, #1a73e8);
      transition: inline-size 0.2s;
    }
    .ngu-file__action {
      flex: none;
      padding: 0.25rem 0.625rem;
      border: 0;
      border-radius: var(--ngu-radius, 0.375rem);
      background: none;
      color: var(--ngu-primary, #1a73e8);
      font: inherit;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
    }
    .ngu-file__remove {
      inline-size: 2rem;
      block-size: 2rem;
      padding: 0;
      color: inherit;
      font-size: 1.25rem;
      line-height: 1;
    }
    .ngu-file__action:hover {
      background: rgba(127, 127, 127, 0.12);
    }
    .ngu-file__action:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 0;
    }
    @media (prefers-reduced-motion: reduce) {
      .ngu-file__bar > span {
        transition: none;
      }
    }
    @media (forced-colors: active) {
      .ngu-file__bar > span {
        background: Highlight;
      }
      .ngu-file--problem {
        border-width: 2px;
      }
    }
    .ngu-sr-only {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `,
})
export class NguFileInput {
  readonly value = model<readonly NguFileValue[] | NguFileValue | null>(null);
  readonly touch = output<void>();
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly required = input(false);
  readonly def = input.required<LeafDef & NguImageOptions>();
  readonly id = input.required<string>();
  readonly errorShown = input(false);
  readonly describedBy = input<string | undefined>();
  /** `'image'` crops and resizes images before they are added. */
  readonly mode = input<'file' | 'image'>('file');

  private readonly context = inject(NguFormContext, { optional: true });
  protected readonly i18n = this.context?.i18n ?? injectNguI18n();
  private readonly picker = viewChild.required<ElementRef<HTMLInputElement>>('picker');
  private readonly cropper = viewChild(NguImageCropper);

  protected readonly dragging = signal(false);
  protected readonly status = signal('');
  protected readonly locked = computed(() => this.disabled() || this.readonly());
  protected readonly multiple = computed(() => !!this.def().multiple);

  /** Files still uploading, failed or refused. Finished files live in the value. */
  private readonly pending = signal<readonly Row[]>([]);
  private readonly doneRows = new WeakMap<object, Row>();
  private readonly previews = new Map<File, string>();
  private readonly uploads = new Map<number, AbortController>();

  protected readonly rows = computed<readonly Row[]>(() => [
    ...asList(this.value()).map((item) => this.rowFor(item)),
    ...this.pending(),
  ]);

  /** Refused files and failed uploads, as field errors. */
  private readonly problems = transformedValue<
    readonly NguFileValue[] | NguFileValue | null,
    readonly Row[]
  >(this.value, {
    parse: (rows) => {
      const refused = rows.find((r) => r.status === 'rejected');
      if (refused) {
        return { error: { kind: 'fileRejected', message: refused.error } };
      }
      const failed = rows.filter((r) => r.status === 'failed').length;
      return failed ? { error: { kind: 'uploadsFailed', count: failed } as { kind: string } } : {};
    },
    format: () => [],
  });

  constructor() {
    // Parse errors clear whenever the value changes, so report the open problems again.
    effect(() => {
      this.value();
      const open = this.pending().filter((r) => r.status === 'failed' || r.status === 'rejected');
      untracked(() => this.problems.set(open));
    });

    // A form reset drops unfinished files and stops their uploads.
    if (this.context) {
      let seen: number | undefined;
      effect(() => {
        const resets = this.context!.resets();
        untracked(() => {
          if (seen !== undefined && resets !== seen) {
            this.dropPending();
          }
          seen = resets;
        });
      });
    }

    inject(DestroyRef).onDestroy(() => {
      this.uploads.forEach((c) => c.abort());
      this.previews.forEach((url) => URL.revokeObjectURL(url));
    });
  }

  protected percent(row: Row): number {
    return Math.round(row.progress * 100);
  }

  protected size(row: Row): string {
    return row.size == null ? '' : formatBytes(row.size, this.i18n.locale());
  }

  protected onPick(event: Event): void {
    const el = event.target as HTMLInputElement;
    const files = Array.from(el.files ?? []);
    // Let the same file be chosen again after it was removed.
    el.value = '';
    void this.add(files);
  }

  protected onDragOver(event: DragEvent): void {
    if (this.locked() || !event.dataTransfer?.types.includes('Files')) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    this.dragging.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !(event.currentTarget as HTMLElement).contains(next)) {
      this.dragging.set(false);
    }
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    if (!this.locked()) {
      void this.add(Array.from(event.dataTransfer?.files ?? []));
    }
  }

  /** Checks, edits (images) and adds or uploads chosen files. */
  async add(files: readonly File[]): Promise<void> {
    if (!files.length) {
      return;
    }
    const chosen = this.multiple() ? files : files.slice(0, 1);
    // Choosing again clears earlier refusals.
    this.pending.update((rows) => rows.filter((r) => r.status !== 'rejected'));
    let added = 0;
    for (const picked of chosen) {
      const problem = this.check(picked);
      if (problem) {
        this.pending.update((rows) => [
          ...rows,
          {
            key: nextKey++,
            name: picked.name,
            size: picked.size,
            status: 'rejected',
            progress: 0,
            error: problem,
          },
        ]);
        continue;
      }
      const file =
        this.mode() === 'image' && isImage(picked.type) ? await this.editImage(picked) : picked;
      if (!file) {
        continue; // crop cancelled
      }
      added++;
      if (this.def().upload) {
        this.start(file);
      } else {
        this.commit(file);
      }
    }
    const refused = this.pending().find((r) => r.status === 'rejected');
    this.announce(
      refused?.error ?? (added ? this.i18n.message('filesAdded', { count: added }) : ''),
    );
    this.touch.emit();
  }

  protected retry(row: Row): void {
    if (row.file) {
      this.start(row.file, row.key);
    }
  }

  protected remove(row: Row): void {
    if (row.status === 'done') {
      const rest = asList(this.value()).filter((v) => v !== row.value);
      this.value.set(this.multiple() ? rest : null);
    } else {
      this.uploads.get(row.key)?.abort();
      this.pending.update((rows) => rows.filter((r) => r.key !== row.key));
    }
    if (row.file && !asList(this.value()).includes(row.file)) {
      this.revoke(row.file);
    }
    this.announce(this.i18n.message('fileRemoved', { name: row.name }));
    this.touch.emit();
    // The removed button had focus; keep the user in the field.
    this.picker().nativeElement.focus();
  }

  private check(file: File): string | undefined {
    const def = this.def();
    if (!matchesAccept(file, def.accept)) {
      return this.i18n.message('fileType', { name: file.name });
    }
    if (def.maxSize != null && file.size > def.maxSize) {
      return this.i18n.message('fileTooLarge', {
        name: file.name,
        size: formatBytes(def.maxSize, this.i18n.locale()),
      });
    }
    return undefined;
  }

  private async editImage(file: File): Promise<File | null> {
    const def = this.def();
    const crop = def.crop ?? true;
    const cropper = this.cropper();
    if (crop !== false && cropper) {
      return cropper.open(file, {
        ...def,
        aspect: typeof crop === 'object' ? crop.aspect : undefined,
      });
    }
    return processImage(file, def);
  }

  private start(file: File, key = nextKey++): void {
    const upload = this.def().upload!;
    const controller = new AbortController();
    this.uploads.get(key)?.abort();
    this.uploads.set(key, controller);
    this.put({
      key,
      name: file.name,
      size: file.size,
      status: 'uploading',
      progress: 0,
      file,
      preview: this.previewOf(file),
    });
    const work = upload(file, {
      signal: controller.signal,
      progress: (fraction) => this.patch(key, { progress: Math.min(1, Math.max(0, fraction)) }),
    }).then(
      (result) => {
        if (controller.signal.aborted) {
          return;
        }
        this.pending.update((rows) => rows.filter((r) => r.key !== key));
        // Keep showing the local preview when the server returns no URL.
        const preview = this.previews.get(file);
        if (preview && !result.url) {
          this.doneRows.set(result, { ...this.rowFor(result), preview });
        }
        this.commit(result);
      },
      () => {
        if (!controller.signal.aborted) {
          this.patch(key, { status: 'failed', error: this.i18n.message('uploadFailed') });
          this.announce(`${file.name}: ${this.i18n.message('uploadFailed')}`);
        }
      },
    );
    work.finally(() => {
      if (this.uploads.get(key) === controller) {
        this.uploads.delete(key);
      }
    });
    this.context?.track(work);
  }

  private commit(item: NguFileValue): void {
    if (this.multiple()) {
      this.value.set([...asList(this.value()), item]);
    } else {
      const old = asList(this.value())[0];
      if (old && isFile(old)) {
        this.revoke(old);
      }
      this.value.set(item);
    }
  }

  private rowFor(item: NguFileValue): Row {
    let row = this.doneRows.get(item);
    if (!row) {
      const preview = isFile(item)
        ? this.previewOf(item)
        : item.url && isImage(item.type)
          ? item.url
          : undefined;
      row = {
        key: nextKey++,
        name: item.name,
        size: item.size,
        status: 'done',
        progress: 1,
        value: item,
        file: isFile(item) ? item : undefined,
        preview,
      };
      this.doneRows.set(item, row);
    }
    return row;
  }

  private previewOf(file: File): string | undefined {
    if (!isImage(file.type) || typeof URL.createObjectURL !== 'function') {
      return undefined;
    }
    let url = this.previews.get(file);
    if (!url) {
      url = URL.createObjectURL(file);
      this.previews.set(file, url);
    }
    return url;
  }

  private revoke(file: File): void {
    const url = this.previews.get(file);
    if (url) {
      URL.revokeObjectURL(url);
      this.previews.delete(file);
    }
  }

  private put(row: Row): void {
    this.pending.update((rows) =>
      rows.some((r) => r.key === row.key)
        ? rows.map((r) => (r.key === row.key ? row : r))
        : [...rows, row],
    );
  }

  private patch(key: number, change: Partial<Row>): void {
    this.pending.update((rows) => rows.map((r) => (r.key === key ? { ...r, ...change } : r)));
  }

  private dropPending(): void {
    this.uploads.forEach((c) => c.abort());
    this.uploads.clear();
    for (const row of this.pending()) {
      if (row.file) {
        this.revoke(row.file);
      }
    }
    this.pending.set([]);
  }

  /** Repeated text is read again. */
  private announce(text: string): void {
    this.status.set(this.status() === text ? text + ' ' : text);
  }

  focus(options?: FocusOptions): void {
    this.picker().nativeElement.focus(options);
  }
}
