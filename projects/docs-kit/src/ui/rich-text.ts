import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Renders text in which `backticks` mark inline code. Content stays text, never HTML. */
@Component({
  selector: 'app-rich',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@for (part of parts(); track $index) {
    @if (part.code) {
      <code>{{ part.text }}</code>
    } @else {
      {{ part.text }}
    }
  }`,
  host: { style: 'display: contents' },
})
export class RichText {
  readonly text = input.required<string>();

  protected readonly parts = computed(() =>
    this.text()
      .split('`')
      .map((text, i) => ({ text, code: i % 2 === 1 }))
      .filter((p) => p.text !== ''),
  );
}
