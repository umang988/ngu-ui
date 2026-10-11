import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { defineForm, NguForm, type SubmitAction, type SubmitErrors } from 'ngu-form';
import { suggestDomain } from '../api/fake-profile';
import { checkUsername } from '../api/fake-users';
import { COUNTRIES, REGIONS } from '../api/regions';

interface Signup {
  name: string;
  account: {
    username: string;
    email: string;
    password: string;
    confirm: string;
  };
  profile: {
    age: number;
    country: string;
    state: string;
    website: string;
    bio: string;
  };
  plan: 'free' | 'pro';
  /** Only asked for on the Pro plan, and left out of the request otherwise. */
  company?: string;
  newsletter: boolean;
}

/** What the server expects: no password confirmation, a full website URL. */
interface SignupRequest {
  name: string;
  username: string;
  email: string;
  password: string;
  profile: { age: number; country: string; state: string; website: string | null; bio: string };
  plan: 'free' | 'pro';
  company?: string;
  newsletter: boolean;
}

const regionsOf = (country: string) => REGIONS[country] ?? [];

@Component({
  selector: 'app-signup',
  imports: [NguForm, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="demo-toolbar">
      <button type="button" (click)="fillSample()">Fill sample</button>
      <button type="button" (click)="resetSignup()">Reset</button>
    </div>
    <ngu-form
      [form]="signup"
      [action]="register"
      [warnOnUnload]="true"
      errorSummary
      submitLabel="Create account"
      (submitted)="submitted.set($event)"
    />

    <div class="demo-panels">
      <section>
        <h3>State</h3>
        <pre tabindex="0">{{ state() | json }}</pre>
      </section>
      <section>
        <h3>Changes</h3>
        <pre tabindex="0">{{ signup.changes() | json }}</pre>
      </section>
      <section>
        <h3>Payload</h3>
        <pre tabindex="0">{{ signup.payload() | json }}</pre>
      </section>
      <section>
        <h3>Last submit</h3>
        <pre tabindex="0">{{ submitted() ? (submitted() | json) : 'Nothing submitted yet' }}</pre>
      </section>
    </div>
  `,
})
export class SignupForm {
  protected readonly submitted = signal<SignupRequest | undefined>(undefined);

  protected readonly signup = defineForm<Signup, SignupRequest>(
    {
      name: '',
      account: { username: '', email: '', password: '', confirm: '' },
      profile: { age: 18, country: '', state: '', website: '', bio: '' },
      plan: 'free',
      company: '',
      newsletter: false,
    },
    {
      name: { label: 'Full name', placeholder: 'Jane Doe', required: true, minLength: 2, maxLength: 60, counter: false },
      account: {
        title: 'Account',
        cols: { base: 1, sm: 2 },
        fields: {
          username: {
            label: 'Username',
            required: true,
            minLength: 3,
            debounce: 300,
            autocomplete: 'username',
            hint: 'Try "admin" to see the server check',
            validateAsync: (value, _model, _scope, abort) => checkUsername(value, abort),
          },
          email: {
            label: 'Email',
            type: 'email',
            required: true,
            autocomplete: 'email',
            // A warning, not an error: the address may be right.
            warn: (value) => {
              const domain = suggestDomain(value);
              return domain ? `Did you mean ${value.split('@')[0]}@${domain}?` : undefined;
            },
          },
          password: {
            label: 'Password',
            type: 'password',
            required: true,
            minLength: 8,
            autocomplete: 'new-password',
            // A meter and checklist; scores below 2 ("Fair") are refused.
            strength: { min: 2 },
          },
          confirm: {
            label: 'Confirm password',
            type: 'password',
            required: true,
            autocomplete: 'new-password',
            validate: (value, model) => (value === model.account.password ? undefined : 'Passwords do not match'),
          },
        },
      },
      profile: {
        title: 'Profile',
        cols: { base: 1, sm: 2, lg: 3 },
        fields: {
          age: { label: 'Age', min: 18, max: 120 },
          country: { label: 'Country', type: 'select', placeholder: 'Choose…', required: true, options: COUNTRIES },
          state: {
            label: 'State or region',
            type: 'select',
            placeholder: 'Choose…',
            // Cascading select: the list follows the country, and a stale state is cleared.
            options: (m) => regionsOf(m.profile.country),
            // Required only where the country has regions.
            required: (m) => regionsOf(m.profile.country).length > 0 && 'Choose a state or region',
            disabled: (m) => regionsOf(m.profile.country).length === 0,
          },
          website: { label: 'Website', prefix: 'https://', placeholder: 'example.com', span: 3, autocomplete: 'url' },
          bio: { label: 'Bio', type: 'textarea', span: 3, maxLength: 200, rows: 2, maxRows: 8 },
        },
      },
      $plan: { heading: 'Subscription' },
      plan: {
        label: 'Plan',
        type: 'radio',
        options: [
          { value: 'free', label: 'Free' },
          { value: 'pro', label: 'Pro' },
        ],
      },
      company: { label: 'Company', required: true, hidden: (m) => m.plan !== 'pro' },
      $privacy: { text: 'We only email you about your account unless you opt in below.' },
      newsletter: 'Send me product updates',
    },
    {
      omitHidden: true,
      mapValue: ({ account, profile, ...rest }) => ({
        ...rest,
        username: account.username,
        email: account.email,
        password: account.password,
        profile: { ...profile, website: profile.website ? `https://${profile.website}` : null },
      }),
    },
  );

  protected readonly state = computed(() => ({
    dirty: this.signup.dirty(),
    touched: this.signup.touched(),
    valid: this.signup.valid(),
    pending: this.signup.pending(),
    submitting: this.signup.submitting(),
  }));

  /** Pretend server: "@taken.com" emails are registered already, the name "busy" fails the whole form. */
  protected readonly register: SubmitAction<Signup, SignupRequest> = async (request) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (request.email.endsWith('@taken.com')) {
      return { 'account.email': 'An account with this email already exists' } satisfies SubmitErrors<Signup>;
    }
    if (request.name.trim().toLowerCase() === 'busy') {
      return 'The server is busy. Please try again.';
    }
    return undefined;
  };

  protected fillSample(): void {
    this.signup.patch({
      name: 'Umang T',
      account: { username: 'umang-t', email: 'umang@taken.com', password: 'supersecret', confirm: 'supersecret' },
      profile: { country: 'in', state: 'gj' },
    });
  }

  protected resetSignup(): void {
    this.signup.reset();
    this.submitted.set(undefined);
  }
}
