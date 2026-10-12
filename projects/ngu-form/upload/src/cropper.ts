import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { injectNguLook, type NguI18n } from 'ngu-form';
import { renderImage } from './image';
import type { NguImageOptions } from './types';

let nextId = 0;

const MAX_ZOOM = 4;

/**
 * A modal dialog that crops an image to a frame. The image covers the frame; people drag it
 * or use the zoom and position sliders, so the dialog works with a keyboard alone. Escape
 * cancels. Native `<dialog>` keeps focus inside and returns it afterwards.
 */
@Component({
  selector: 'ngu-image-cropper',
  host: { '[class.ngu-unstyled]': "look().theme === 'none'" },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="ngu-crop"
      [attr.aria-labelledby]="titleId"
      [attr.aria-describedby]="hintId"
      (cancel)="onCancel($event)"
    >
      @if (source(); as src) {
        <h2 class="ngu-crop__title" [id]="titleId">{{ i18n().message('cropTitle') }}</h2>
        <p class="ngu-crop__hint" [id]="hintId">{{ i18n().message('cropHint') }}</p>
        <div #frame class="ngu-crop__frame">
          <div
            class="ngu-crop__stage"
            [style.inline-size.px]="stage().w"
            [style.block-size.px]="stage().h"
            (pointerdown)="onPointerDown($event)"
            (pointermove)="onPointerMove($event)"
            (pointerup)="onPointerUp($event)"
            (pointercancel)="onPointerUp($event)"
            (wheel)="onWheel($event)"
          >
            <img
              #image
              [src]="src"
              alt=""
              draggable="false"
              (load)="onLoad()"
              [style.inline-size.px]="layout().width"
              [style.block-size.px]="layout().height"
              [style.transform]="layout().transform"
            />
          </div>
        </div>
        <div class="ngu-crop__controls">
          <label class="ngu-crop__slider">
            <span>{{ i18n().message('cropZoom') }}</span>
            <input
              type="range"
              min="1"
              [attr.max]="maxZoom"
              step="0.01"
              [value]="zoom()"
              (input)="zoom.set(numberOf($event))"
            />
          </label>
          <label class="ngu-crop__slider">
            <span>{{ i18n().message('cropX') }}</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              [value]="x() * 100"
              [disabled]="!room().x"
              (input)="x.set(numberOf($event) / 100)"
            />
          </label>
          <label class="ngu-crop__slider">
            <span>{{ i18n().message('cropY') }}</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              [value]="y() * 100"
              [disabled]="!room().y"
              (input)="y.set(numberOf($event) / 100)"
            />
          </label>
        </div>
        <div class="ngu-crop__actions">
          <button type="button" class="ngu-crop__button" (click)="finish(false)">
            {{ i18n().message('cropCancel') }}
          </button>
          <button
            type="button"
            class="ngu-crop__button ngu-crop__button--primary"
            (click)="finish(true)"
          >
            {{ i18n().message('cropApply') }}
          </button>
        </div>
      }
    </dialog>
  `,
  styles: `
    :host(:where(:not(.ngu-unstyled))) .ngu-crop {
      inline-size: min(34rem, calc(100vw - 2rem));
      box-sizing: border-box;
      padding: 1.25rem;
      border: 0;
      border-radius: calc(var(--ngu-radius, 0.375rem) * 2);
      background: var(--ngu-surface, #fff);
      color: inherit;
      box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.3);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-crop::backdrop {
      background: rgba(0, 0, 0, 0.55);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-crop__title {
      margin: 0 0 0.25rem;
      font-size: 1.125rem;
      font-weight: 600;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-crop__hint {
      margin: 0 0 0.75rem;
      font-size: 0.875rem;
      color: var(--ngu-hint-color, #6b6b6b);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-crop__frame {
      display: flex;
      justify-content: center;
    }
    .ngu-crop__stage {
      position: relative;
      overflow: hidden;
      touch-action: none;
      user-select: none;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-crop__stage {
      border-radius: var(--ngu-radius, 0.375rem);
      background: var(--ngu-skeleton-color, rgba(127, 127, 127, 0.16));
      cursor: grab;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-crop__stage:active {
      cursor: grabbing;
    }
    /* Physical left on purpose: the image is moved with a physical translate. */
    .ngu-crop__stage img {
      position: absolute;
      inset-block-start: 0;
      left: 0;
      max-inline-size: none;
      pointer-events: none;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-crop__controls {
      display: grid;
      gap: 0.5rem;
      margin-block: 1rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-crop__slider {
      display: grid;
      grid-template-columns: 9rem 1fr;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.875rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-crop__slider input {
      accent-color: var(--ngu-primary, #1a73e8);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-crop__slider input:focus-visible,
    :host(:where(:not(.ngu-unstyled))) .ngu-crop__button:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 2px;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-crop__actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-crop__button {
      padding: 0.5rem 1rem;
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
      background: none;
      color: inherit;
      font: inherit;
      font-weight: 500;
      cursor: pointer;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-crop__button--primary {
      border-color: var(--ngu-primary, #1a73e8);
      background: var(--ngu-primary, #1a73e8);
      color: var(--ngu-on-primary, #fff);
    }
    @media (max-width: 30rem) {
      :host(:where(:not(.ngu-unstyled))) .ngu-crop__slider {
        grid-template-columns: 1fr;
        gap: 0.25rem;
      }
    }
    @media (forced-colors: active) {
      :host(:where(:not(.ngu-unstyled))) .ngu-crop {
        border: 1px solid CanvasText;
      }
    }
  `,
})
export class NguImageCropper {
  protected readonly look = injectNguLook();
  readonly i18n = input.required<NguI18n>();

  protected readonly titleId = `ngu-crop-title-${nextId}`;
  protected readonly hintId = `ngu-crop-hint-${nextId++}`;
  protected readonly maxZoom = MAX_ZOOM;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly frame = viewChild<ElementRef<HTMLElement>>('frame');
  private readonly image = viewChild<ElementRef<HTMLImageElement>>('image');

  protected readonly source = signal<string | undefined>(undefined);
  /** The image's own size. */
  private readonly natural = signal({ w: 0, h: 0 });
  /** The crop frame on screen, in CSS pixels. */
  protected readonly stage = signal({ w: 0, h: 0 });
  protected readonly zoom = signal(1);
  /** Position of the frame over the image, from 0 (start) to 1 (end), per axis. */
  protected readonly x = signal(0.5);
  protected readonly y = signal(0.5);

  private file: File | undefined;
  private options: NguImageOptions & { aspect?: number } = {};
  private resolve: ((file: File | null) => void) | undefined;
  private drag: { id: number; x: number; y: number } | undefined;

  /** The image covers the frame at zoom 1. */
  protected readonly layout = computed(() => {
    const { w: W, h: H } = this.stage();
    const { w, h } = this.natural();
    if (!W || !w) {
      return { width: 0, height: 0, left: 0, top: 0, scale: 0, transform: 'none' };
    }
    const scale = Math.max(W / w, H / h) * this.zoom();
    const width = w * scale;
    const height = h * scale;
    const left = -(width - W) * this.x();
    const top = -(height - H) * this.y();
    return { width, height, left, top, scale, transform: `translate(${left}px, ${top}px)` };
  });
  /** Whether the image can move along each axis. */
  protected readonly room = computed(() => {
    const l = this.layout();
    const s = this.stage();
    return { x: l.width - s.w > 0.5, y: l.height - s.h > 0.5 };
  });

  /** Shows the dialog for `file` and resolves with the cropped file, or `null` when cancelled. */
  open(file: File, options: NguImageOptions & { aspect?: number }): Promise<File | null> {
    this.resolve?.(null);
    this.file = file;
    this.options = options;
    this.zoom.set(1);
    this.x.set(0.5);
    this.y.set(0.5);
    this.natural.set({ w: 0, h: 0 });
    this.stage.set({ w: 0, h: 0 });
    this.source.set(URL.createObjectURL(file));
    const dialog = this.dialog().nativeElement;
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    }
    return new Promise((resolve) => (this.resolve = resolve));
  }

  protected numberOf(event: Event): number {
    return Number((event.target as HTMLInputElement).value);
  }

  protected onLoad(): void {
    const img = this.image()?.nativeElement;
    if (!img) {
      return;
    }
    this.natural.set({ w: img.naturalWidth, h: img.naturalHeight });
    this.measure();
  }

  /** Fits the frame, in the requested shape, into the dialog and half the window height. */
  private measure(): void {
    const frame = this.frame()?.nativeElement;
    const { w, h } = this.natural();
    if (!frame || !w || !h) {
      return;
    }
    const aspect = this.options.aspect && this.options.aspect > 0 ? this.options.aspect : w / h;
    const maxW = frame.clientWidth || 320;
    const maxH = Math.max(160, Math.min(window.innerHeight * 0.5, 480));
    let W = maxW;
    let H = W / aspect;
    if (H > maxH) {
      H = maxH;
      W = H * aspect;
    }
    this.stage.set({ w: Math.round(W), h: Math.round(H) });
  }

  protected onPointerDown(event: PointerEvent): void {
    this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.drag || this.drag.id !== event.pointerId) {
      return;
    }
    const l = this.layout();
    const s = this.stage();
    const dx = event.clientX - this.drag.x;
    const dy = event.clientY - this.drag.y;
    this.drag = { ...this.drag, x: event.clientX, y: event.clientY };
    if (l.width > s.w) {
      this.x.set(clamp(this.x() - dx / (l.width - s.w)));
    }
    if (l.height > s.h) {
      this.y.set(clamp(this.y() - dy / (l.height - s.h)));
    }
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.drag?.id === event.pointerId) {
      this.drag = undefined;
    }
  }

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.zoom.set(Math.min(MAX_ZOOM, Math.max(1, this.zoom() * (1 - event.deltaY * 0.002))));
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    void this.finish(false);
  }

  protected async finish(apply: boolean): Promise<void> {
    const resolve = this.resolve;
    this.resolve = undefined;
    let result: File | null = null;
    if (apply && this.file) {
      const img = this.image()?.nativeElement;
      const l = this.layout();
      const s = this.stage();
      result =
        img && l.scale
          ? await renderImage(
              img,
              { sx: -l.left / l.scale, sy: -l.top / l.scale, sw: s.w / l.scale, sh: s.h / l.scale },
              this.file,
              this.options,
            )
          : this.file;
    }
    const dialog = this.dialog().nativeElement;
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
    const src = this.source();
    if (src) {
      URL.revokeObjectURL(src);
    }
    this.source.set(undefined);
    this.file = undefined;
    resolve?.(result);
  }
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}
