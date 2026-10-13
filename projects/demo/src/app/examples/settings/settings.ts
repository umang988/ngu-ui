import { ChangeDetectionStrategy, Component, effect, resource, signal, untracked } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';
import { fetchSettings, patchSettings, type DeepPartialSettings, type Settings } from '../api/fake-settings';

const EMPTY: Settings = {
  profile: { displayName: '', language: 'en', timezone: 'UTC' },
  notifications: { digest: 'never', product: false, security: false },
  privacy: { visibility: 'private', showEmail: false, searchable: false },
};

type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; at: Date } | { kind: 'failed'; message: string };

/** How long to wait after the last change before saving. */
const AUTOSAVE_MS = 600;

@Component({
  selector: 'app-settings',
  imports: [NguForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="demo-save-state" role="status">{{ stateText() }}</p>
    <ngu-form [form]="settings" errorsOn="touched" />
    @if (state().kind === 'failed') {
      <button type="button" (click)="saveNow()">Try again</button>
    }
  `,
  styles: `
    :host {
      display: block;
      max-width: 40rem;
    }
    .demo-save-state {
      min-height: 1.5em;
      color: var(--ngu-hint-color);
    }
  `,
})
export class SettingsForm {
  protected readonly source = resource({ loader: ({ abortSignal }) => fetchSettings(abortSignal) });

  // No submit button: every valid change is saved shortly after it is made.
  protected readonly settings = defineForm<Settings>(
    EMPTY,
    {
      profile: {
        title: 'Profile',
        fields: {
          displayName: { label: 'Display name', required: true, maxLength: 40, hint: 'Type "offline" to see a failed save' },
          language: {
            label: 'Language',
            type: 'select',
            options: [
              { value: 'en', label: 'English' },
              { value: 'hi', label: 'Hindi' },
              { value: 'ar', label: 'Arabic' },
            ],
          },
          timezone: {
            label: 'Time zone',
            type: 'select',
            options: ['UTC', 'Asia/Kolkata', 'Europe/London', 'America/New_York'].map((zone) => ({ value: zone, label: zone })),
          },
        },
      },
      notifications: {
        title: 'Notifications',
        fields: {
          digest: {
            label: 'Email digest',
            type: 'segmented',
            options: [
              { value: 'never', label: 'Never' },
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
            ],
          },
          product: { label: 'Product news', type: 'switch' },
          security: { label: 'Security alerts', type: 'switch', hint: 'Sign-ins from new devices and password changes' },
        },
      },
      privacy: {
        title: 'Privacy',
        fields: {
          visibility: {
            label: 'Who can see your profile',
            type: 'radio',
            options: [
              { value: 'public', label: 'Anyone' },
              { value: 'team', label: 'My team' },
              { value: 'private', label: 'Only me' },
            ],
          },
          showEmail: { label: 'Show my email on my profile', type: 'switch', disabled: (m) => m.privacy.visibility === 'private' },
          searchable: { label: 'Let search engines find my profile', type: 'switch', hidden: (m) => m.privacy.visibility !== 'public' },
        },
      },
    },
    { load: this.source, layout: 'tabs' },
  );

  protected readonly state = signal<SaveState>({ kind: 'idle' });

  constructor() {
    // Save the unsaved values once the user pauses, as long as they are valid.
    effect((onCleanup) => {
      const pending = this.settings.changes();
      if (this.settings.loading() || !this.settings.valid() || Object.keys(pending).length === 0) {
        return;
      }
      const timer = setTimeout(() => this.save(pending), AUTOSAVE_MS);
      onCleanup(() => clearTimeout(timer));
    });
  }

  protected saveNow(): void {
    void this.save(untracked(this.settings.changes));
  }

  private async save(sent: DeepPartialSettings): Promise<void> {
    this.state.set({ kind: 'saving' });
    try {
      await patchSettings(sent);
      // Mark what was sent as saved. Values changed again while the request ran stay unsaved,
      // so the next pass sends them; patching them would undo the newer edit.
      this.settings.patch(stillEqual(sent, untracked(this.settings.value)));
      this.state.set({ kind: 'saved', at: new Date() });
    } catch (error) {
      this.state.set({ kind: 'failed', message: error instanceof Error ? error.message : 'Saving failed' });
    }
  }

  protected stateText(): string {
    const s = this.state();
    if (this.settings.loading()) return 'Loading your settings…';
    if (!this.settings.valid()) return 'Not saved: fix the highlighted field.';
    switch (s.kind) {
      case 'saving':
        return 'Saving…';
      case 'saved':
        return `All changes saved at ${s.at.toLocaleTimeString()}`;
      case 'failed':
        return `Not saved: ${s.message}.`;
      default:
        return 'Changes save automatically.';
    }
  }
}

/** The parts of `sent` whose values are still the same in `current`. */
function stillEqual(sent: DeepPartialSettings, current: Settings): DeepPartialSettings {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [group, values] of Object.entries(sent)) {
    for (const [key, value] of Object.entries(values ?? {})) {
      if ((current as unknown as Record<string, Record<string, unknown>>)[group][key] === value) {
        (out[group] ??= {})[key] = value;
      }
    }
  }
  return out;
}
