import { Component, computed, signal } from '@angular/core';
import { NguDropdown, provideNguDropdownConfig, type NguDropdownMessages } from 'ngu-dropdown';
import { loadCustomers } from './fake-server';

const FRENCH: Partial<NguDropdownMessages> = {
  placeholder: 'Choisir un client',
  searchPlaceholder: 'Rechercher…',
  emptyTitle: 'Aucun résultat',
  emptyMessage: 'Aucune option ne correspond à votre saisie.',
  loading: 'Chargement…',
  clear: 'Effacer la sélection',
  count: (n) => `${n.toLocaleString('fr')} ${n === 1 ? 'option' : 'options'}`,
};

/** A signal, so switching language updates every dropdown below without reloading. */
const language = signal<'en' | 'fr'>('fr');

@Component({
  selector: 'demo-dropdown-messages',
  imports: [NguDropdown],
  providers: [
    provideNguDropdownConfig({ messages: computed(() => (language() === 'fr' ? FRENCH : {})) }),
  ],
  template: `
    <div class="dd-demo">
      <div class="dd-switch" role="group" aria-label="Language">
        <button
          type="button"
          [attr.aria-pressed]="language() === 'en'"
          (click)="language.set('en')"
        >
          English
        </button>
        <button
          type="button"
          [attr.aria-pressed]="language() === 'fr'"
          (click)="language.set('fr')"
        >
          Français
        </button>
      </div>
      <div>
        <label for="language-customer">{{ language() === 'fr' ? 'Client' : 'Customer' }}</label>
        <ngu-dropdown
          inputId="language-customer"
          [fetchFn]="load"
          [(value)]="customerId"
          optionValue="id"
          optionLabel="name"
        />
      </div>
    </div>
  `,
})
export class DropdownMessagesDemo {
  protected readonly language = language;
  readonly load = loadCustomers;
  readonly customerId = signal<number | null>(null);
  readonly value = computed(() => ({ language: language(), customerId: this.customerId() }));
}
