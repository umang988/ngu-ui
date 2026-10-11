import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, Injectable, signal } from '@angular/core';
import { defineForm, NguForm, provideNguMessages } from 'ngu-form';
import { z } from 'zod';
import { LANGUAGES, translate, type Lang } from './translations';

interface Registration {
  name: string;
  email: string;
  phone: string;
  birthday: Date | null;
  income: number;
  password: string;
  terms: boolean;
}

/** 18 years before today, at midnight UTC like date inputs. */
function adultCutoff(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear() - 18, now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Every rule lives in the schema. Messages are translation keys, so they follow the
 * language like the labels do.
 */
const schema = z.object({
  name: z.string().trim().min(2, 'v.name'),
  email: z.email('v.email'),
  phone: z.string().length(10, 'v.phone'),
  birthday: z.date('v.birthday').max(adultCutoff(), 'v.adult'),
  income: z.number('v.income').min(0, 'v.income'),
  password: z.string().min(8, 'v.password'),
  terms: z.literal(true, 'v.terms'),
});

/** The chosen language, shared with the message provider below. */
@Injectable()
class Language {
  readonly code = signal<Lang>('en');
  readonly info = computed(() => LANGUAGES.find((l) => l.code === this.code())!);
}

@Component({
  selector: 'app-languages',
  imports: [NguForm, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    Language,
    // One provider wires labels, schema messages and ngu-form's own texts to the language.
    provideNguMessages(() => {
      const language = inject(Language);
      return computed(() => {
        const { code, locale } = language.info();
        return { locale, translate: (key: string) => translate(code, key) };
      });
    }),
  ],
  template: `
    <fieldset class="lang-switch">
      <legend>Language</legend>
      @for (l of languages; track l.code) {
        <label [attr.lang]="l.code">
          <input type="radio" name="lang" [value]="l.code" [checked]="language.code() === l.code" (change)="language.code.set(l.code)" />
          {{ l.name }}
        </label>
      }
    </fieldset>

    <div [attr.lang]="language.code()" [attr.dir]="language.info().dir">
      <ngu-form [form]="registration" errorSummary submitLabel="reg.submit" (submitted)="sent.set($event)" />
      @if (sent(); as s) {
        <section class="demo-result" role="status">
          <p>{{ t('reg.done') }}</p>
          <pre tabindex="0" dir="ltr">{{ s | json }}</pre>
        </section>
      }
    </div>
  `,
  styles: `
    .lang-switch {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.25rem;
      margin: 0 0 1.25rem;
      padding: 0.75rem 1rem;
      border: 1px solid var(--rule);
      border-radius: 0.5rem;
    }
    .lang-switch legend {
      padding-inline: 0.25rem;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .lang-switch label {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      cursor: pointer;
    }
    .demo-result {
      margin-block-start: 1.25rem;
    }
  `,
})
export class LanguagesForm {
  protected readonly language = inject(Language);
  protected readonly languages = LANGUAGES;
  protected readonly sent = signal<Registration | undefined>(undefined);

  protected readonly registration = defineForm<Registration>(
    { name: '', email: '', phone: '', birthday: null, income: 0, password: '', terms: false },
    {
      name: { label: 'reg.name', autocomplete: 'name' },
      email: { label: 'reg.email', type: 'email', autocomplete: 'email' },
      phone: { label: 'reg.phone', mask: '00000 00000', hint: 'reg.phoneHint', autocomplete: 'tel-national' },
      birthday: { label: 'reg.birthday', type: 'date', autocomplete: 'bday' },
      income: { label: 'reg.income', prefix: '₹', min: 0, localized: true },
      password: { label: 'reg.password', type: 'password', autocomplete: 'new-password', strength: true },
      terms: 'reg.terms',
    },
    {
      schema,
      // Unsent answers survive a reload. The password is never stored.
      draft: { key: 'ngu-demo:languages' },
    },
  );

  protected t(key: string): string {
    return translate(this.language.code(), key) ?? key;
  }
}
