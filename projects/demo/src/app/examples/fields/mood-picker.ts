import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Field } from '@angular/forms/signals';
import type { LeafDef } from 'ngu-form';

declare module 'ngu-form' {
  interface NguFieldTypeMap {
    mood: number;
  }
  interface NguFieldOptionsMap {
    /** Faces from saddest to happiest. */
    mood: { faces?: readonly string[] };
  }
}

const FACES = ['😞', '😐', '🙂', '😄'];

/**
 * Custom `type: 'mood'` renderer: a radio group of faces. Writes straight to the field's value
 * signal. Reads its own `faces` option from `def`, typed through `NguFieldOptionsMap`.
 */
@Component({
  selector: 'app-mood-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'radiogroup', '[attr.aria-labelledby]': "id() + '-label'" },
  template: `
    @for (face of faces(); track $index) {
      <button
        type="button"
        class="face"
        role="radio"
        [class.on]="$index + 1 === value()"
        [attr.aria-checked]="$index + 1 === value()"
        [attr.aria-label]="'Mood ' + ($index + 1) + ' of ' + faces().length"
        [attr.tabindex]="tabStop() === $index + 1 ? 0 : -1"
        [disabled]="state().disabled()"
        (click)="set($index + 1)"
        (keydown)="onKey($event)"
      >
        {{ face }}
      </button>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      gap: 0.25rem;
    }
    .face {
      font-size: 1.5rem;
      line-height: 1;
      padding: 0.25rem 0.375rem;
      border: 2px solid transparent;
      border-radius: 0.5rem;
      background: none;
      cursor: pointer;
      filter: grayscale(1);
      opacity: 0.7;
    }
    .face.on {
      border-color: var(--ngu-primary, #1a73e8);
      filter: none;
      opacity: 1;
    }
    .face:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 2px;
    }
  `,
})
export class MoodPicker {
  readonly field = input.required<Field<number>>();
  readonly def = input<LeafDef & { faces?: readonly string[] }>();
  readonly id = input<string>();

  protected readonly faces = computed(() => this.def()?.faces ?? FACES);
  protected readonly state = computed(() => this.field()());
  protected readonly value = computed(() => this.state().value());
  /** The face that takes Tab: the chosen one, else the first (the radio group pattern). */
  protected readonly tabStop = computed(() => this.value() || 1);

  protected set(mood: number): void {
    this.state().value.set(mood);
    this.state().markAsDirty();
    this.state().markAsTouched();
  }

  /** Arrow keys move and choose, as in a native radio group. */
  protected onKey(event: KeyboardEvent): void {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) {
      return;
    }
    event.preventDefault();
    const count = this.faces().length;
    const rtl = getComputedStyle(event.target as Element).direction === 'rtl';
    const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
    const next = ((this.tabStop() - 1 + (rtl && horizontal ? -step : step) + count) % count) + 1;
    this.set(next);
    const buttons = (
      event.currentTarget as HTMLElement
    ).parentElement?.querySelectorAll<HTMLButtonElement>('.face');
    buttons?.[next - 1]?.focus();
  }
}
