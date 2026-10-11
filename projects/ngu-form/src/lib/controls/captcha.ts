import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import { transformedValue, type Field } from '@angular/forms/signals';
import { NGU_CAPTCHA, type NguCaptchaAdapter, type NguCaptchaWidget } from '../captcha';
import { NguFormContext } from '../components/ngu-form-context';
import { injectNguI18n, type NguI18n } from '../messages';

interface CaptchaState {
  readonly token: string;
  readonly failed: boolean;
}

/**
 * Hosts a captcha widget through an `NguCaptchaAdapter`. The token is the field's value; it
 * is cleared when it expires, and the widget is reset after every submit that reached the
 * action (tokens are single use) and on form reset. A widget that fails reports
 * `captchaFailed`.
 */
@Component({
  selector: 'ngu-captcha',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ngu-captcha', tabindex: '-1' },
  template: `<div #slot class="ngu-captcha__slot"></div>`,
  styles: `
    :host {
      display: block;
      min-block-size: 4rem;
      outline: none;
    }
    :host(:focus-visible) {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 2px;
    }
  `,
})
export class NguCaptcha {
  readonly value = model<string>('');
  readonly touch = output<void>();
  /** The field, to clear the token without marking it as changed by the user. */
  readonly field = input.required<Field<string>>();
  readonly adapter = input<NguCaptchaAdapter>();
  readonly i18n = input<NguI18n>(injectNguI18n());

  private readonly provided = inject(NGU_CAPTCHA, { optional: true });
  private readonly context = inject(NguFormContext, { optional: true });
  private readonly slot = viewChild.required<ElementRef<HTMLElement>>('slot');
  private widget: NguCaptchaWidget | undefined;
  private destroyed = false;

  /** Feeds widget failures to the field as a parse error, which blocks the submit. */
  private readonly state = transformedValue<string, CaptchaState>(this.value, {
    parse: (s) => (s.failed ? { error: { kind: 'captchaFailed' } } : { value: s.token }),
    format: (token) => ({ token: token ?? '', failed: false }),
  });

  constructor() {
    afterNextRender(() => void this.render());
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.widget?.remove?.();
    });

    // Tokens are single use: show a fresh check after a submit ran, and after a reset.
    if (this.context) {
      let seen: string | undefined;
      effect(() => {
        const key = `${this.context!.completed()}|${this.context!.resets()}`;
        untracked(() => {
          if (seen !== undefined && key !== seen) {
            this.refresh();
          }
          seen = key;
        });
      });
    }
  }

  private async render(): Promise<void> {
    const adapter = this.adapter() ?? this.provided;
    if (!adapter) {
      throw new Error(
        'ngu-form: a "captcha" field needs `captcha` in its spec or provideNguCaptcha().',
      );
    }
    try {
      const widget = await adapter.render(
        this.slot().nativeElement,
        {
          token: (token) => {
            this.state.set({ token, failed: false });
            this.touch.emit();
          },
          expired: () => this.field()().value.set(''),
          error: () => this.state.set({ token: '', failed: true }),
        },
        { language: this.i18n().locale() },
      );
      if (this.destroyed) {
        widget.remove?.();
      } else {
        this.widget = widget;
      }
    } catch {
      this.state.set({ token: '', failed: true });
    }
  }

  private refresh(): void {
    this.widget?.reset();
    this.field()().value.set('');
  }

  focus(options?: FocusOptions): void {
    (this.slot().nativeElement.closest('.ngu-captcha') as HTMLElement | null)?.focus(options);
  }
}
