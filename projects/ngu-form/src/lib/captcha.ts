import { InjectionToken, type Provider } from '@angular/core';

/** What a captcha widget reports back to its field. */
export interface NguCaptchaEvents {
  /** The provider issued a token. It becomes the field's value. */
  token(value: string): void;
  /** The token expired; the value is cleared until the check is solved again. */
  expired(): void;
  /** The widget failed to load or to run. */
  error(): void;
}

export interface NguCaptchaRenderOptions {
  /** The form's language, such as `'en'` or `'hi'`, for providers that translate their widget. */
  readonly language: string;
}

/** A rendered widget. */
export interface NguCaptchaWidget {
  /** Shows a fresh check and drops the token. Called after each submit and on reset. */
  reset(): void;
  /** Removes the widget when the field leaves the page. */
  remove?(): void;
}

/**
 * Connects a captcha provider to a `type: 'captcha'` field. `nguTurnstile`, `nguHCaptcha` and
 * `nguRecaptcha` implement it; any other provider takes a few lines.
 *
 * ```ts
 * const myCaptcha: NguCaptchaAdapter = {
 *   render(host, events) {
 *     const id = myProvider.render(host, { onSuccess: events.token, onExpire: events.expired });
 *     return { reset: () => myProvider.reset(id) };
 *   },
 * };
 * ```
 */
export interface NguCaptchaAdapter {
  render(
    host: HTMLElement,
    events: NguCaptchaEvents,
    options: NguCaptchaRenderOptions,
  ): NguCaptchaWidget | Promise<NguCaptchaWidget>;
}

export const NGU_CAPTCHA = new InjectionToken<NguCaptchaAdapter>('NGU_CAPTCHA');

/** Sets the captcha provider for `type: 'captcha'` fields that do not name their own. */
export function provideNguCaptcha(adapter: NguCaptchaAdapter): Provider {
  return { provide: NGU_CAPTCHA, useValue: adapter };
}

/** Options shared by the built-in provider adapters. */
export interface NguScriptCaptchaOptions {
  /** The site key from the provider's dashboard. */
  readonly siteKey: string;
  /** Widget theme. reCAPTCHA has no `'auto'` and uses light for it. */
  readonly theme?: 'light' | 'dark' | 'auto';
  /** More parameters for the provider's render call, such as `{ size: 'compact' }`. */
  readonly params?: Readonly<Record<string, unknown>>;
}

interface ScriptProvider {
  readonly src: string;
  /** Name of the API object the script defines on `window`. */
  readonly global: string;
  /** Render parameter that sets the widget language; `undefined` when only the script URL can. */
  readonly languageParam?: string;
}

const PROVIDERS = {
  turnstile: {
    src: 'https://challenges.cloudflare.com/turnstile/v0/api.js',
    global: 'turnstile',
    languageParam: 'language',
  },
  hcaptcha: { src: 'https://js.hcaptcha.com/1/api.js', global: 'hcaptcha', languageParam: 'hl' },
  recaptcha: { src: 'https://www.google.com/recaptcha/api.js', global: 'grecaptcha' },
} satisfies Record<string, ScriptProvider>;

/** Cloudflare Turnstile. Loads its script on first use. */
export function nguTurnstile(options: NguScriptCaptchaOptions): NguCaptchaAdapter {
  return scriptCaptcha(PROVIDERS.turnstile, options);
}

/** hCaptcha. Loads its script on first use. */
export function nguHCaptcha(options: NguScriptCaptchaOptions): NguCaptchaAdapter {
  return scriptCaptcha(PROVIDERS.hcaptcha, options);
}

/** Google reCAPTCHA v2 (checkbox). Loads its script on first use. */
export function nguRecaptcha(options: NguScriptCaptchaOptions): NguCaptchaAdapter {
  return scriptCaptcha(PROVIDERS.recaptcha, options);
}

interface CaptchaApi {
  render(host: HTMLElement, params: Record<string, unknown>): unknown;
  reset(id?: unknown): void;
  remove?(id?: unknown): void;
}

function scriptCaptcha(
  provider: ScriptProvider,
  options: NguScriptCaptchaOptions,
): NguCaptchaAdapter {
  return {
    async render(host, events, { language }) {
      // Only reCAPTCHA reads the language from its script URL; that happens once per page.
      const src = provider.languageParam
        ? provider.src
        : `${provider.src}?hl=${encodeURIComponent(language)}`;
      const api = await loadScript(src, provider.global);
      const theme = options.theme === 'auto' && !provider.languageParam ? 'light' : options.theme;
      const id = api.render(host, {
        sitekey: options.siteKey,
        callback: events.token,
        'expired-callback': events.expired,
        'error-callback': events.error,
        ...(theme ? { theme } : {}),
        ...(provider.languageParam ? { [provider.languageParam]: language } : {}),
        ...options.params,
      });
      return {
        reset: () => api.reset(id),
        remove: () => api.remove?.(id),
      };
    },
  };
}

const scripts = new Map<string, Promise<CaptchaApi>>();
let callbackCount = 0;

/** Loads a provider script once, with explicit rendering, and resolves with its API object. */
function loadScript(src: string, global: string): Promise<CaptchaApi> {
  const w = window as unknown as Record<string, unknown>;
  const ready = w[global] as CaptchaApi | undefined;
  if (ready && typeof ready.render === 'function') {
    return Promise.resolve(ready);
  }
  let promise = scripts.get(src);
  if (!promise) {
    promise = new Promise<CaptchaApi>((resolve, reject) => {
      const callback = `nguCaptchaReady${callbackCount++}`;
      w[callback] = () => {
        delete w[callback];
        resolve(w[global] as CaptchaApi);
      };
      const script = document.createElement('script');
      script.src = `${src}${src.includes('?') ? '&' : '?'}render=explicit&onload=${callback}`;
      script.async = true;
      script.onerror = () => {
        scripts.delete(src);
        delete w[callback];
        script.remove();
        reject(new Error(`ngu-form: could not load ${src}`));
      };
      document.head.appendChild(script);
    });
    scripts.set(src, promise);
  }
  return promise;
}
