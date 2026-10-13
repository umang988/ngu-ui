import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { injectNguI18n, type NguI18n } from '../messages';
import { SR_ONLY } from './choice';
import { injectNguLook } from '../look';

/**
 * Free-text tags for a `string[]` value. Enter or a separator adds the typed text, pasting a
 * list adds each entry, Backspace in the empty input removes the last tag, and every tag has
 * a remove button. Duplicates (ignoring case) are refused with a message. Additions and
 * removals are announced.
 */
@Component({
  selector: 'ngu-tags',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.ngu-unstyled]': "look().theme === 'none'",
    class: 'ngu-tags',
    '[class.ngu-tags--disabled]': 'disabled()',
    '[class.ngu-tags--invalid]': 'errorShown()',
    '(click)': 'onHostClick($event)',
  },
  template: `
    @if (tags().length) {
      <ul class="ngu-tags__list">
        @for (tag of tags(); track $index) {
          <li class="ngu-tag" [class]="look().classes.chip">
            <span class="ngu-tag__text">{{ tag }}</span>
            @if (!disabled() && !readonly()) {
              <button
                type="button"
                class="ngu-tag__remove"
                [attr.aria-label]="i18n().message('removeTag', { tag })"
                (click)="remove($index)"
              >
                <span aria-hidden="true">×</span>
              </button>
            }
          </li>
        }
      </ul>
    }
    <input
      #input
      type="text"
      class="ngu-tags__input"
      [class]="look().classes.control"
      [id]="id()"
      [value]="draft()"
      [placeholder]="placeholder() ?? ''"
      [disabled]="disabled()"
      [readOnly]="readonly()"
      [attr.maxlength]="tagLength() ?? null"
      [attr.enterkeyhint]="'done'"
      [attr.aria-invalid]="errorShown() ? 'true' : null"
      [attr.aria-describedby]="describedBy() ?? null"
      autocomplete="off"
      (input)="onInput($event)"
      (keydown)="onKeydown($event)"
      (paste)="onPaste($event)"
      (blur)="onBlur()"
    />
    <span class="ngu-sr-only" aria-live="polite">{{ status() }}</span>
  `,
  styles: `
    :host(:not(.ngu-unstyled)) {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.375rem;
      padding: 0.3125rem 0.5rem;
      border: 1px solid var(--ngu-border-color, #c7c7c7);
      border-radius: var(--ngu-radius, 0.375rem);
      background: var(--ngu-input-bg, transparent);
      cursor: text;
      min-inline-size: 0;
    }
    :host(.ngu-tags--invalid:not(.ngu-unstyled)) {
      border-color: var(--ngu-error-color, #c62828);
    }
    :host(.ngu-tags--disabled:not(.ngu-unstyled)) {
      cursor: default;
    }
    :host(:not(.ngu-unstyled)):has(.ngu-tags__input:focus-visible) {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 1px;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-tags__list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin: 0;
      padding: 0;
      list-style: none;
      min-inline-size: 0;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.125rem;
      max-inline-size: 100%;
      padding-block: 0.125rem;
      padding-inline: 0.5rem 0.125rem;
      border-radius: 999px;
      background: var(--ngu-tag-bg, rgba(127, 127, 127, 0.14));
      font-size: 0.875rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-tag__text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-tag:not(:has(.ngu-tag__remove)) {
      padding-inline-end: 0.5rem;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-tag__remove {
      display: inline-grid;
      place-items: center;
      inline-size: 1.5rem;
      block-size: 1.5rem;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: none;
      color: inherit;
      font: inherit;
      font-size: 1rem;
      line-height: 1;
      cursor: pointer;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-tag__remove:hover {
      background: rgba(127, 127, 127, 0.2);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-tag__remove:focus-visible {
      outline: 2px solid var(--ngu-focus-color, #1a73e8);
      outline-offset: 0;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-tags__input {
      flex: 1 1 8rem;
      min-inline-size: 6rem;
      padding: 0.1875rem 0.25rem;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-tags__input:focus {
      outline: none;
    }
    @media (forced-colors: active) {
      :host(:where(:not(.ngu-unstyled))) .ngu-tag {
        border: 1px solid CanvasText;
      }
      :host(.ngu-tags--invalid:not(.ngu-unstyled)) {
        border-width: 2px;
      }
    }
    ${SR_ONLY}
  `,
})
export class NguTags {
  protected readonly look = injectNguLook();
  readonly value = model<readonly string[]>([]);
  readonly touch = output<void>();
  readonly disabled = input(false);
  readonly readonly = input(false);
  readonly id = input.required<string>();
  readonly placeholder = input<string>();
  /** Longest tag. Not `maxLength`, which `[formField]` reserves. */
  readonly tagLength = input<number>();
  /** Keys that finish a tag. */
  readonly separators = input<readonly string[]>([',']);
  readonly errorShown = input(false);
  readonly describedBy = input<string | undefined>();
  readonly i18n = input<NguI18n>(injectNguI18n());

  protected readonly draft = signal('');
  protected readonly status = signal('');
  protected readonly tags = computed(() => (Array.isArray(this.value()) ? this.value() : []));
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  protected onInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    // Phone keyboards rarely report the separator key, so look for it in the text.
    if (this.separators().some((s) => text.includes(s))) {
      this.addAll(this.split(text));
      this.setDraft('');
    } else {
      this.draft.set(text);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.isComposing) {
      return;
    }
    if (event.key === 'Enter' || this.separators().includes(event.key)) {
      // Enter must not submit the form; a separator is never part of a tag.
      if (event.key === 'Enter' && this.draft().trim() === '') {
        return;
      }
      event.preventDefault();
      this.commit();
    } else if (
      event.key === 'Backspace' &&
      this.draft() === '' &&
      this.tags().length &&
      !this.readonly()
    ) {
      event.preventDefault();
      this.remove(this.tags().length - 1, false);
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text') ?? '';
    const parts = this.split(text);
    if (parts.length > 1) {
      event.preventDefault();
      this.addAll([this.draft() + parts[0], ...parts.slice(1)]);
      this.setDraft('');
    }
  }

  protected onBlur(): void {
    this.commit();
    this.touch.emit();
  }

  protected onHostClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.input().nativeElement.focus();
    }
  }

  protected remove(index: number, refocus = true): void {
    const tag = this.tags()[index];
    if (tag === undefined) {
      return;
    }
    this.value.set(this.tags().filter((_, i) => i !== index));
    this.announce(this.i18n().message('tagRemoved', { tag }));
    if (refocus) {
      // The button that had focus is gone; keep the user in the field.
      this.input().nativeElement.focus();
    }
  }

  private commit(): void {
    if (this.draft().trim() !== '') {
      this.addAll([this.draft()]);
    }
    this.setDraft('');
  }

  private addAll(parts: readonly string[]): void {
    const tags = [...this.tags()];
    const added: string[] = [];
    let duplicate: string | undefined;
    const max = this.tagLength();
    for (const part of parts) {
      const tag = (max ? part.trim().slice(0, max) : part.trim()).trim();
      if (!tag) {
        continue;
      }
      if (tags.some((t) => t.toLocaleLowerCase() === tag.toLocaleLowerCase())) {
        duplicate = tag;
        continue;
      }
      tags.push(tag);
      added.push(tag);
    }
    if (added.length) {
      this.value.set(tags);
      this.announce(this.i18n().message('tagAdded', { tag: added.join(', ') }));
    } else if (duplicate) {
      this.announce(this.i18n().message('tagDuplicate', { tag: duplicate }));
    }
  }

  private split(text: string): string[] {
    let parts = [text];
    for (const separator of [...this.separators(), '\n', '\r', '\t']) {
      parts = parts.flatMap((p) => p.split(separator));
    }
    return parts;
  }

  private setDraft(text: string): void {
    this.draft.set(text);
    // The input event already changed the element; make sure it shows the cleared text.
    this.input().nativeElement.value = text;
  }

  /** Repeated text is read again. */
  private announce(text: string): void {
    this.status.set(this.status() === text ? text + ' ' : text);
  }

  focus(options?: FocusOptions): void {
    this.input().nativeElement.focus(options);
  }
}
