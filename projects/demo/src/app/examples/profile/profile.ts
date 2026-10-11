import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, resource, signal, untracked } from '@angular/core';
import { defineForm, NguForm, nguIndexedDbDrafts, provideNguMessages, type SubmitAction } from 'ngu-form';
import { fetchProfile, patchProfile, suggestDomain, type Profile } from '../api/fake-profile';

const EMPTY: Profile = {
  displayName: '',
  email: '',
  phone: '',
  birthday: null,
  salary: 0,
  bio: '',
  notify: { product: false, security: false },
};

@Component({
  selector: 'app-profile',
  imports: [NguForm, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Numbers and dates in this form follow Indian English: 12,50,000.
  providers: [provideNguMessages({ locale: 'en-IN' })],
  template: `
    <div class="demo-toolbar">
      <button type="button" (click)="profile.history.undo()" [disabled]="!profile.history.canUndo()" aria-keyshortcuts="Control+Z Meta+Z">
        Undo
      </button>
      <button
        type="button"
        (click)="profile.history.redo()"
        [disabled]="!profile.history.canRedo()"
        aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
      >
        Redo
      </button>
      <button type="button" (click)="source.reload()">Reload from server</button>
    </div>

    <ngu-form [form]="profile" [action]="save" submitLabel="Save changes" (submitted)="saved.set(lastPatch)" />

    <div class="demo-panels">
      <section>
        <h3>PATCH body</h3>
        <pre tabindex="0">{{ profile.changes() | json }}</pre>
      </section>
      <section>
        <h3>Draft</h3>
        <pre tabindex="0">{{ draftState() }}</pre>
      </section>
      <section>
        <h3>Last saved</h3>
        <pre tabindex="0">{{ saved() ? (saved() | json) : 'Nothing saved yet' }}</pre>
      </section>
    </div>
  `,
})
export class ProfileForm {
  /** The record arrives from a server; the form shows placeholders until then. */
  protected readonly source = resource({ loader: ({ abortSignal }) => fetchProfile(abortSignal) });

  protected readonly profile = defineForm<Profile>(
    EMPTY,
    {
      displayName: { label: 'Display name', parse: (text) => text.trim(), required: true, maxLength: 40 },
      email: {
        label: 'Email',
        type: 'email',
        required: true,
        autocomplete: 'email',
        warn: (value) => {
          const domain = suggestDomain(value);
          return domain ? `Did you mean ${value.split('@')[0]}@${domain}?` : undefined;
        },
      },
      phone: { label: 'Mobile', mask: '00000 00000', autocomplete: 'tel-national' },
      birthday: { label: 'Birthday', type: 'date', max: new Date(), autocomplete: 'bday' },
      salary: {
        label: 'Yearly salary',
        min: 0,
        prefix: '₹',
        localized: true,
        hint: 'Shown with Indian digit grouping, such as 12,50,000',
        warn: (value) => (value > 100_000_000 ? 'That is more than ₹10 crore. Is a digit extra?' : undefined),
      },
      bio: {
        label: 'Bio',
        type: 'textarea',
        rows: 2,
        maxRows: 6,
        maxLength: 160,
        warn: (value) => (/\d{10}/.test(value) ? 'Your bio is public. Consider leaving out phone numbers.' : undefined),
      },
      notify: {
        title: 'Email me about',
        fields: { product: 'Product news', security: 'Security alerts' },
      },
    },
    {
      load: this.source,
      // IndexedDB here; the three-language example uses the default, localStorage.
      draft: { key: 'ngu-demo:profile:42', storage: nguIndexedDbDrafts() },
      history: true,
    },
  );

  protected readonly saved = signal<Partial<Profile> | undefined>(undefined);
  protected lastPatch: Partial<Profile> = {};

  /** Sends only what changed, then the form counts the new values as saved. */
  protected readonly save: SubmitAction<Profile> = async () => {
    this.lastPatch = untracked(this.profile.changes) as Partial<Profile>;
    await patchProfile(this.lastPatch);
    return undefined;
  };

  protected draftState(): string {
    const saved = this.profile.draft.savedAt();
    return saved ? `Saved locally at ${saved.toLocaleTimeString()}` : 'No unsaved changes';
  }
}
