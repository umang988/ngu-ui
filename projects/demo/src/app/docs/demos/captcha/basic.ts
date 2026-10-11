import { Component } from '@angular/core';
import { defineForm, NguForm, provideNguCaptcha, type NguCaptchaAdapter } from 'ngu-form';

/**
 * A pretend provider so the demo runs offline. In an app, pass nguTurnstile({ siteKey }),
 * nguHCaptcha({ siteKey }) or nguRecaptcha({ siteKey }) to provideNguCaptcha instead.
 */
const pretendCaptcha: NguCaptchaAdapter = {
  render(host, events) {
    const label = document.createElement('label');
    label.className = 'demo-captcha';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.addEventListener('change', () =>
      box.checked ? setTimeout(() => events.token(`token-${Date.now()}`), 300) : events.expired(),
    );
    label.append(box, ' I am not a robot (pretend check)');
    host.replaceChildren(label);
    return { reset: () => (box.checked = false) };
  },
};

@Component({
  selector: 'demo-captcha-basic',
  imports: [NguForm],
  providers: [provideNguCaptcha(pretendCaptcha)],
  template: `<ngu-form [form]="form" [action]="send" submitLabel="Send" />`,
})
export class CaptchaBasicDemo {
  readonly form = defineForm(
    { message: '', human: '' },
    {
      message: { label: 'Message', type: 'textarea', required: true },
      // Required by default; the token is reset after each submit.
      human: { label: 'Security check', type: 'captcha' },
    },
  );

  readonly send = async () => {
    await new Promise((done) => setTimeout(done, 500));
    return undefined; // sent: the captcha resets for the next message
  };
}
