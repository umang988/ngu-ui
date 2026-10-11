import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { defineForm, NguForm } from 'ngu-form';
import { CodeBlock } from 'docs-kit/ui/code-block';
import { RichText } from 'docs-kit/ui/rich-text';
import { EXAMPLES } from '../example/examples';

/** The spec on the left of the live demo. Keep it in step with `trial` below. */
const TRIAL_SPEC = `readonly trial = defineForm(
  { name: '', email: '', seats: 5, plan: 'team', updates: true },
  {
    name: { label: 'Name', required: true },
    email: { label: 'Work email', type: 'email', required: true },
    seats: { label: 'Seats', min: 1, max: 500, suffix: 'people' },
    plan: {
      label: 'Plan',
      type: 'radio',
      options: [
        { value: 'team', label: 'Team' },
        { value: 'business', label: 'Business' },
      ],
    },
    updates: 'Email me product news',
  },
);`;

const TRIAL_TEMPLATE = `<ngu-form [form]="trial" submitLabel="Start trial" />`;

interface ValueRow {
  readonly key: string;
  readonly json: string;
  readonly kind: 'string' | 'number' | 'boolean' | 'other';
}

@Component({
  selector: 'app-home',
  imports: [NguForm, RouterLink, CodeBlock, RichText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly spec = TRIAL_SPEC;
  protected readonly template = TRIAL_TEMPLATE;
  protected readonly examples = EXAMPLES;

  protected readonly trial = defineForm(
    { name: '', email: '', seats: 5, plan: 'team', updates: true },
    {
      name: { label: 'Name', required: true },
      email: { label: 'Work email', type: 'email', required: true },
      seats: { label: 'Seats', min: 1, max: 500, suffix: 'people' },
      plan: {
        label: 'Plan',
        type: 'radio',
        options: [
          { value: 'team', label: 'Team' },
          { value: 'business', label: 'Business' },
        ],
      },
      updates: 'Email me product news',
    },
  );

  protected readonly rows = computed<readonly ValueRow[]>(() =>
    Object.entries(this.trial.value()).map(([key, v]) => ({
      key,
      json: JSON.stringify(v),
      kind: typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? (typeof v as ValueRow['kind']) : 'other',
    })),
  );

  /** Per key, how many times it changed: the parity restarts the highlight animation. */
  protected readonly flashes = signal<Readonly<Record<string, number>>>({});
  protected readonly latest = signal<string | undefined>(undefined);
  protected readonly submitted = signal(false);

  protected readonly installCopied = signal(false);

  constructor() {
    let previous: Record<string, unknown> | undefined;
    effect(() => {
      const value = this.trial.value() as Record<string, unknown>;
      if (previous) {
        const changed = Object.keys(value).filter((k) => !Object.is(value[k], previous![k]));
        if (changed.length) {
          this.flashes.update((f) => ({ ...f, ...Object.fromEntries(changed.map((k) => [k, (f[k] ?? 0) + 1])) }));
          this.latest.set(changed.at(-1));
          this.submitted.set(false);
        }
      }
      previous = { ...value };
    });
  }

  protected flashClass(key: string): string | null {
    const n = this.flashes()[key];
    return n ? `flash-${n % 2}` : null;
  }

  protected async copyInstall(): Promise<void> {
    try {
      await navigator.clipboard.writeText('npm install ngu-form');
      this.installCopied.set(true);
      setTimeout(() => this.installCopied.set(false), 2000);
    } catch {
      // The command is visible; people can select it.
    }
  }
}
