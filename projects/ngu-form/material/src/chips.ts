import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatChipGrid, MatChipInput, MatChipRemove, MatChipRow, type MatChipInputEvent } from '@angular/material/chips';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import type { NguFieldRenderContext } from 'ngu-form';
import { errorMatcher, NGU_MATERIAL_OPTIONS } from './shared';

/** Tags as Material chips: Enter or a separator adds one, pasting splits, Backspace removes. */
@Component({
  selector: 'ngu-mat-chips',
  imports: [MatFormField, MatLabel, MatHint, MatError, MatChipGrid, MatChipRow, MatChipRemove, MatChipInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = context();
    @let tags = values();
    <mat-form-field [appearance]="options.appearance!" [floatLabel]="options.floatLabel!" [subscriptSizing]="options.subscriptSizing!">
      @if (c.label) {
        <mat-label class="ngu-label">{{ c.label }}</mat-label>
      }
      <mat-chip-grid #grid [disabled]="c.state.disabled()" [required]="c.required" [errorStateMatcher]="matcher" [attr.aria-label]="c.label">
        @for (tag of tags; track $index) {
          <mat-chip-row [editable]="false" (removed)="remove($index)">
            {{ tag }}
            <button matChipRemove type="button" [attr.aria-label]="c.i18n.message('removeTag', { tag })">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z" /></svg>
            </button>
          </mat-chip-row>
        }
        <input
          #text
          [id]="c.id"
          [placeholder]="c.placeholder"
          [readonly]="c.state.readonly()"
          [matChipInputFor]="grid"
          [matChipInputAddOnBlur]="true"
          (matChipInputTokenEnd)="add($event)"
          (keydown)="separate($event, text)"
          (paste)="paste($event)"
          (blur)="c.touch()"
        />
      </mat-chip-grid>
      @if (c.error) {
        <mat-error class="ngu-error">{{ c.error }}</mat-error>
      } @else if (c.hint) {
        <mat-hint class="ngu-hint">{{ c.hint }}</mat-hint>
      }
    </mat-form-field>
  `,
  styles: `
    :host {
      display: block;
    }
    mat-form-field {
      inline-size: 100%;
    }
  `,
})
export class NguMatChips {
  /** The field's render context: texts, state and options, from ngu-form. */
  readonly context = input.required<NguFieldRenderContext>();
  protected readonly options = inject(NGU_MATERIAL_OPTIONS);
  protected readonly matcher = errorMatcher(this.context);

  protected values(): readonly string[] {
    const value = this.context().state.value();
    return Array.isArray(value) ? value : [];
  }

  /** Enter adds a tag (Material's default); so do the spec's separators, default a comma. */
  protected separate(event: KeyboardEvent, input: HTMLInputElement): void {
    if ((this.context().def.separators ?? [',']).includes(event.key)) {
      event.preventDefault();
      this.addAll([input.value]);
      input.value = '';
    }
  }

  protected add(event: MatChipInputEvent): void {
    this.addAll([event.value]);
    event.chipInput.clear();
  }

  protected paste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text') ?? '';
    const separators = this.context().def.separators ?? [','];
    if (!separators.some((s) => text.includes(s)) && !/\r?\n/.test(text)) {
      return;
    }
    event.preventDefault();
    const pattern = new RegExp(`[${separators.map((s) => s.replace(/[\\\]^-]/g, '\\$&')).join('')}\\r\\n]+`);
    this.addAll(text.split(pattern));
  }

  protected remove(index: number): void {
    const next = this.values().filter((_, i) => i !== index);
    this.write(next);
  }

  /** Trims, skips empty and repeated tags, and cuts each to `maxLength`. */
  private addAll(raw: readonly string[]): void {
    const max = this.context().def.maxLength;
    const next = [...this.values()];
    for (const part of raw) {
      const tag = (max ? part.trim().slice(0, max) : part.trim());
      if (tag && !next.includes(tag)) {
        next.push(tag);
      }
    }
    if (next.length !== this.values().length) {
      this.write(next);
    }
  }

  private write(next: readonly string[]): void {
    const c = this.context();
    c.state.value.set(next);
    c.state.markAsDirty();
  }
}
