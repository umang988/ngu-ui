import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { injectNguI18n, injectNguLook, NguFormContext, type LeafDef } from 'ngu-form';
import type { NguSignatureOptions } from './types';

/** Fonts that look handwritten, in the order they are tried. */
const SCRIPT_FONTS =
  "'Segoe Script', 'Bradley Hand', 'Brush Script MT', 'Snell Roundhand', cursive";

/**
 * A signature drawn with a mouse, finger or pen, stored as a PNG data URL (`''` when empty).
 * "Type instead" offers a text field whose name is drawn in a handwriting font, so the field
 * can be completed with a keyboard alone.
 */
@Component({
  selector: 'ngu-signature-pad',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ngu-signature', '[class.ngu-signature--invalid]': 'errorShown()', '[class.ngu-unstyled]': "look().theme === 'none'" },
  template: `
    @if (typing()) {
      <input
        type="text"
        class="ngu-signature__name"
        [id]="id()"
        [value]="name()"
        [placeholder]="i18n.message('signatureName')"
        [disabled]="disabled()"
        [readOnly]="readonly()"
        [attr.required]="required() ? '' : null"
        [attr.aria-invalid]="errorShown() ? 'true' : null"
        [attr.aria-describedby]="describedBy() ?? null"
        autocomplete="name"
        (input)="onName($event)"
        (blur)="touch.emit()"
      />
    }
    <canvas
      #canvas
      class="ngu-signature__pad"
      [class.ngu-signature__pad--typed]="typing()"
      [attr.id]="typing() ? null : id()"
      role="img"
      [attr.aria-label]="padLabel()"
      [style.block-size.px]="height()"
      (pointerdown)="onDown($event)"
      (pointermove)="onMove($event)"
      (pointerup)="onUp($event)"
      (pointercancel)="onUp($event)"
    ></canvas>
    <div class="ngu-signature__actions">
      <button
        type="button"
        class="ngu-signature__button"
        [disabled]="disabled() || readonly()"
        (click)="toggleTyping()"
      >
        {{ i18n.message(typing() ? 'signatureDraw' : 'signatureType') }}
      </button>
      <button
        type="button"
        class="ngu-signature__button"
        [disabled]="disabled() || readonly() || !value()"
        (click)="clear()"
      >
        {{ i18n.message('signatureClear') }}
      </button>
    </div>
  `,
  styles: `
    :host(:not(.ngu-unstyled)) {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-inline-size: 0;
    }
    .ngu-signature__pad {
      touch-action: none;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-signature__pad {
      display: block;
      inline-size: 100%;
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
      background: var(--ngu-input-bg, transparent);
      cursor: crosshair;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-signature__pad--typed {
      cursor: default;
    }
    :host(.ngu-signature--invalid:not(.ngu-unstyled)) .ngu-signature__pad,
    :host(.ngu-signature--invalid:not(.ngu-unstyled)) .ngu-signature__name {
      border-color: var(--ngu-error-color, #c62828);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-signature__name {
      font: inherit;
      padding: var(--ngu-input-padding, var(--_ngu-input-padding, 0.5rem 0.75rem));
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
      background: var(--ngu-input-bg, transparent);
      color: inherit;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-signature__actions {
      display: flex;
      gap: 0.5rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-signature__button {
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
    :host(:where(:not(.ngu-unstyled))) .ngu-signature__button:disabled {
      color: var(--ngu-hint-color, #6b6b6b);
      cursor: default;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-signature__name:focus-visible,
    :host(:where(:not(.ngu-unstyled))) .ngu-signature__button:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 1px;
    }
  `,
})
export class NguSignaturePad {
  protected readonly look = injectNguLook();
  /** The signature as a PNG data URL, or `''` when not signed. Bound by `[formField]`. */
  readonly value = model<string>('');
  /** Emits when the user finishes a stroke or leaves the name input. */
  readonly touch = output<void>();
  /** Stops drawing and typing, and disables the buttons. Bound by `[formField]`. */
  readonly disabled = input(false);
  /** Shows the signature but stops changes to it, as `disabled`. Bound by `[formField]`. */
  readonly readonly = input(false);
  /** Sets `required` on the name input of "Type instead". Bound by `[formField]`. */
  readonly required = input(false);
  /** The field's spec, with the signature options. */
  readonly def = input.required<LeafDef & NguSignatureOptions>();
  /** Id of the name input while typing, else of the pad; the label's `for` points at it. */
  readonly id = input.required<string>();
  /** True while the field's error shows: sets the error style and the name input's `aria-invalid`. */
  readonly errorShown = input(false);
  /** Ids for the name input's `aria-describedby`: the field's hint and messages. */
  readonly describedBy = input<string | undefined>();

  protected readonly i18n = inject(NguFormContext, { optional: true })?.i18n ?? injectNguI18n();
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  protected readonly typing = signal(false);
  protected readonly name = signal('');
  protected readonly height = computed(() => this.def().height ?? 160);
  protected readonly padLabel = computed(() =>
    this.value()
      ? `${this.i18n.message('signaturePad')} ${this.i18n.message('signatureSigned')}`
      : this.i18n.message('signaturePad'),
  );

  /** The data URL this pad wrote last, to tell its own writes from the app's. */
  private written = '';
  private stroke: { id: number; points: { x: number; y: number }[] } | undefined;
  private ready = false;

  constructor() {
    afterNextRender(() => {
      this.ready = true;
      this.resize();
      this.paint(this.value());
    });
    // A value from the app (initial data, reset, patch) replaces the drawing.
    effect(() => {
      const value = this.value() ?? '';
      untracked(() => {
        if (this.ready && value !== this.written) {
          this.written = value;
          this.name.set('');
          this.paint(value);
        }
      });
    });
  }

  protected toggleTyping(): void {
    this.typing.update((t) => !t);
    this.clear();
    const target = this.typing() ? '.ngu-signature__name' : '.ngu-signature__button';
    afterNextRender(() => this.host.querySelector<HTMLElement>(target)?.focus(), {
      injector: this.injector,
    });
  }

  protected clear(): void {
    this.name.set('');
    this.context()?.clearRect(
      0,
      0,
      this.canvas().nativeElement.width,
      this.canvas().nativeElement.height,
    );
    this.write('');
  }

  protected onName(event: Event): void {
    const name = (event.target as HTMLInputElement).value;
    this.name.set(name);
    const canvas = this.canvas().nativeElement;
    const ctx = this.context();
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (name.trim()) {
      const size = Math.min(canvas.height * 0.45, (canvas.width * 1.6) / Math.max(name.length, 6));
      ctx.font = `${size}px ${SCRIPT_FONTS}`;
      ctx.fillStyle = this.pen();
      ctx.textBaseline = 'middle';
      ctx.fillText(name.trim(), canvas.width * 0.06, canvas.height * 0.55, canvas.width * 0.88);
      this.write(canvas.toDataURL('image/png'));
    } else {
      this.write('');
    }
  }

  protected onDown(event: PointerEvent): void {
    if (
      this.typing() ||
      this.disabled() ||
      this.readonly() ||
      (event.pointerType === 'mouse' && event.button !== 0)
    ) {
      return;
    }
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.stroke = { id: event.pointerId, points: [this.point(event)] };
    this.drawDot(this.stroke.points[0]);
  }

  protected onMove(event: PointerEvent): void {
    if (!this.stroke || this.stroke.id !== event.pointerId) {
      return;
    }
    const points = this.stroke.points;
    points.push(this.point(event));
    const ctx = this.context();
    if (!ctx || points.length < 3) {
      return;
    }
    // A curve through the midpoints keeps fast strokes smooth.
    const [a, b, c] = points.slice(-3);
    ctx.beginPath();
    ctx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2);
    ctx.quadraticCurveTo(b.x, b.y, (b.x + c.x) / 2, (b.y + c.y) / 2);
    ctx.stroke();
  }

  protected onUp(event: PointerEvent): void {
    if (this.stroke?.id !== event.pointerId) {
      return;
    }
    this.stroke = undefined;
    this.write(this.canvas().nativeElement.toDataURL('image/png'));
    this.touch.emit();
  }

  private point(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvas().nativeElement.getBoundingClientRect();
    const ratio = this.canvas().nativeElement.width / (rect.width || 1);
    return { x: (event.clientX - rect.left) * ratio, y: (event.clientY - rect.top) * ratio };
  }

  private drawDot(p: { x: number; y: number }): void {
    const ctx = this.context();
    if (!ctx) {
      return;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private context(): CanvasRenderingContext2D | null {
    const ctx = this.canvas().nativeElement.getContext?.('2d') ?? null;
    if (ctx) {
      const ratio = this.ratio();
      ctx.lineWidth = 2.5 * ratio;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = ctx.fillStyle = this.pen();
    }
    return ctx;
  }

  private pen(): string {
    return this.def().penColor ?? (getComputedStyle(this.host).color || '#000');
  }

  private ratio(): number {
    return Math.max(1, Math.min(3, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1));
  }

  /** Sizes the canvas bitmap to its box at the screen's pixel density. */
  private resize(): void {
    const canvas = this.canvas().nativeElement;
    const ratio = this.ratio();
    canvas.width = Math.round((canvas.clientWidth || 480) * ratio);
    canvas.height = Math.round(this.height() * ratio);
  }

  /** Shows a stored signature, or an empty pad. */
  private paint(dataUrl: string): void {
    const canvas = this.canvas().nativeElement;
    const ctx = this.context();
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!dataUrl) {
      return;
    }
    const img = new Image();
    img.onload = () => {
      const k = Math.min(canvas.width / img.width, canvas.height / img.height, 1);
      ctx.drawImage(img, 0, 0, img.width * k, img.height * k);
    };
    img.src = dataUrl;
  }

  private write(dataUrl: string): void {
    this.written = dataUrl;
    if (dataUrl !== this.value()) {
      this.value.set(dataUrl);
    }
  }

  /**
   * Focuses the name input while typing, else the "Type instead" button. Signal Forms calls it to
   * focus the field.
   */
  focus(options?: FocusOptions): void {
    this.host
      .querySelector<HTMLElement>('.ngu-signature__name, .ngu-signature__button')
      ?.focus(options);
  }
}
