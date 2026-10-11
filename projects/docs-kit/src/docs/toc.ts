import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

interface TocItem {
  readonly id: string;
  readonly title: string;
  readonly level: number;
}

/** Headings above this line, in CSS pixels from the top, count as passed. */
const READ_LINE = 120;

/**
 * "On this page": the `h2` and `h3` headings of `root`, read from the page as it renders,
 * with the one being read marked as the reader scrolls.
 */
@Component({
  selector: 'app-toc',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'toc' },
  template: `
    @if (items().length > 1) {
      <nav aria-labelledby="toc-title">
        <p id="toc-title" class="toc__title">On this page</p>
        <ul>
          @for (item of items(); track item.id) {
            <li [class.toc__sub]="item.level === 3">
              <a
                [routerLink]="[]"
                [fragment]="item.id"
                queryParamsHandling="preserve"
                [class.is-active]="item.id === active()"
                [attr.aria-current]="item.id === active() ? 'location' : null"
                >{{ item.title }}</a
              >
            </li>
          }
        </ul>
      </nav>
    }
  `,
})
export class Toc {
  /** The element whose headings are listed. */
  readonly root = input.required<HTMLElement>();

  protected readonly items = signal<readonly TocItem[]>([]);
  protected readonly active = signal('');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const root = this.root();
      let frame = 0;
      const read = () => {
        frame = 0;
        // Headings inside live demos are not part of the page outline.
        const headings = Array.from(root.querySelectorAll<HTMLElement>('h2[id], h3[id]')).filter(
          (h) => !h.closest('.demo'),
        );
        const items = headings.map((h) => ({
          id: h.id,
          title: h.textContent?.trim() ?? '',
          level: h.tagName === 'H3' ? 3 : 2,
        }));
        const before = this.items();
        if (
          items.length !== before.length ||
          items.some((it, i) => it.id !== before[i].id || it.title !== before[i].title)
        ) {
          this.items.set(items);
        }
        // The last heading above the reading line is the one being read; near the end of the
        // page, the last heading.
        const atEnd =
          window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
        let current = headings[0]?.id ?? '';
        for (const h of headings) {
          if (h.getBoundingClientRect().top <= READ_LINE) {
            current = h.id;
          }
        }
        if (atEnd && headings.length) {
          current = headings.at(-1)!.id;
        }
        this.active.set(current);
      };
      const schedule = () => {
        if (!frame) {
          frame = requestAnimationFrame(read);
        }
      };
      read();
      const observer = new MutationObserver(schedule);
      observer.observe(root, { childList: true, subtree: true, characterData: true });
      window.addEventListener('scroll', schedule, { passive: true });
      destroyRef.onDestroy(() => {
        observer.disconnect();
        window.removeEventListener('scroll', schedule);
        cancelAnimationFrame(frame);
      });
    });
  }
}
