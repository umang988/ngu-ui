import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  forwardRef,
  inject,
  input,
  linkedSignal,
  untracked,
} from '@angular/core';
import type { Field } from '@angular/forms/signals';
import { resolveCols } from '../config';
import { NGU_STATIC_HIDDEN, ordered, withoutTitle } from '../internal';
import { injectNguI18n } from '../messages';
import type { AnyFieldDef, Cols, FormDefinition } from '../types';
import { NguArray } from './ngu-array';
import { NguDynamic } from './ngu-dynamic';
import { NguField } from './ngu-field';
import { NguFormContext } from './ngu-form-context';
import { NguSection } from './ngu-section';
import { NguPanel, NguTabs } from './ngu-sections';
import { extendLook, injectOuterLook, NGU_LOOK, slotClass, type NguClassMap } from '../look';

let nextGroupId = 0;

interface Entry {
  readonly key: string;
  readonly path: string;
  readonly def: AnyFieldDef;
  /** Missing for static content, which has no model value. */
  readonly tree: Field<any> | undefined;
  /** `grid-column` value inside this group. */
  readonly column: string | null;
  /** True for a collapsible panel. */
  readonly panel: boolean;
  /** The title a tab or panel header shows. */
  readonly title: string | undefined;
  /** The definition without its title, for content under a tab or panel header. */
  readonly inner: AnyFieldDef;
}

/**
 * Renders a definition object as a CSS grid, recursing into nested groups and arrays.
 * The group places its children: spans are capped at the current column count. With
 * `layout: 'tabs'` the children become tabs; children with `collapsed` set are panels.
 */
@Component({
  selector: 'ngu-group',
  providers: [{ provide: NGU_LOOK, useFactory: () => inject(NguGroup).look }],
  imports: [NguField, NguTabs, NguPanel, forwardRef(() => NguArray), forwardRef(() => NguDynamic)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.ngu-unstyled]': "look().theme === 'none'",
    '[class]': 'hostClass()',
    class: 'ngu-group',
    '[class.ngu-group--invalid]': 'showErrors()',
    '[attr.data-invalid]': "showErrors() ? '' : null",
    '[attr.role]': "title() ? 'group' : null",
    '[attr.aria-labelledby]': 'title() ? titleId : null',
    '[style.--ngu-cols]': 'columns()',
  },
  template: `
    @if (title()) {
      <h3 class="ngu-group__title" [class]="look().classes.title" [id]="titleId">{{ i18n.text(title()) }}</h3>
    }
    @if (description()) {
      <p class="ngu-group__description" [class]="look().classes.description">{{ i18n.text(description()) }}</p>
    }
    @if (layout() === 'tabs') {
      @defer (on immediate) {
        <ngu-tabs
          [tabs]="tabs()"
          [active]="activeTab()"
          [labelledBy]="title() ? titleId : null"
          [idPrefix]="titleId"
          (select)="selectTab($event)"
        />
      }
    } @else {
      <div class="ngu-grid">
        @for (entry of entries(); track entry.key) {
          @if (!isHidden(entry)) {
            @if (entry.panel) {
              @defer (on immediate) {
                <ngu-panel
                  [style.grid-column]="entry.column"
                  [section]="entry"
                  [open]="openPanels().has(entry.key)"
                  [idPrefix]="titleId"
                  (toggle)="togglePanel(entry.key)"
                />
              }
            } @else {
              @switch (entry.def.__ngu) {
                @case ('group') {
                  <ngu-group
                    [style.grid-column]="entry.column"
                    [fields]="entry.def.fields"
                    [tree]="entry.tree!"
                    [cols]="entry.def.cols ?? 1"
                    [title]="entry.def.title"
                    [description]="entry.def.description"
                    [layout]="entry.def.layout ?? 'grid'"
                    [path]="entry.path"
                    [classes]="entry.def.classes"
                    [styleClass]="entry.def.class"
                  />
                }
                @case ('array') {
                  <ngu-array [style.grid-column]="entry.column" [def]="entry.def" [tree]="entry.tree!" [path]="entry.path" />
                }
                @case ('dynamic') {
                  <ngu-dynamic [style.grid-column]="entry.column" [def]="entry.def" [tree]="entry.tree!" [path]="entry.path" />
                }
                @case ('static') {
                  @let s = entry.def;
                  @switch (s.kind) {
                    @case ('divider') {
                      <hr class="ngu-static ngu-divider" [class]="s.class ?? ''" [style.grid-column]="entry.column" />
                    }
                    @case ('text') {
                      <p class="ngu-static ngu-static__text" [class]="staticClass('description', s.class)" [style.grid-column]="entry.column">{{ i18n.text(s.text) }}</p>
                    }
                    @default {
                      @switch (s.level) {
                        @case (2) {
                          <h2 class="ngu-static ngu-static__heading" [class]="staticClass(\'title\', s.class)" [style.grid-column]="entry.column">{{ i18n.text(s.text) }}</h2>
                        }
                        @case (4) {
                          <h4 class="ngu-static ngu-static__heading" [class]="staticClass(\'title\', s.class)" [style.grid-column]="entry.column">{{ i18n.text(s.text) }}</h4>
                        }
                        @case (5) {
                          <h5 class="ngu-static ngu-static__heading" [class]="staticClass(\'title\', s.class)" [style.grid-column]="entry.column">{{ i18n.text(s.text) }}</h5>
                        }
                        @case (6) {
                          <h6 class="ngu-static ngu-static__heading" [class]="staticClass(\'title\', s.class)" [style.grid-column]="entry.column">{{ i18n.text(s.text) }}</h6>
                        }
                        @default {
                          <h3 class="ngu-static ngu-static__heading" [class]="staticClass(\'title\', s.class)" [style.grid-column]="entry.column">{{ i18n.text(s.text) }}</h3>
                        }
                      }
                    }
                  }
                }
                @default {
                  <ngu-field [style.grid-column]="entry.column" [def]="entry.def" [field]="entry.tree!" [path]="entry.path" />
                }
              }
            }
          }
        }
      </div>
    }
    @if (showErrors()) {
      <p class="ngu-error" [class]="look().classes.error" [id]="titleId + '-msg'" tabindex="-1">{{ message() }}</p>
    }
  `,
  styles: `
    :host(:not(.ngu-unstyled)) {
      display: block;
      min-inline-size: 0;
    }
    .ngu-grid {
      display: grid;
      grid-template-columns: repeat(var(--ngu-cols, 1), minmax(0, 1fr));
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-grid {
      gap: var(--ngu-gap, var(--_ngu-gap, 1rem));
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-group__title {
      margin-block: 0 0.5rem;
      margin-inline: 0;
      font-size: var(--ngu-title-size, 1rem);
      font-weight: 600;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-error {
      margin-block: 0.5rem 0;
      margin-inline: 0;
      font-size: 0.8125rem;
      color: var(--ngu-error-color, #c62828);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-group__description {
      margin-block: 0 0.75rem;
      margin-inline: 0;
      font-size: 0.875rem;
      color: var(--ngu-hint-color, #6b6b6b);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-static {
      margin: 0;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-static__heading {
      font-size: var(--ngu-title-size, 1rem);
      font-weight: 600;
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-static__text {
      font-size: 0.875rem;
      color: var(--ngu-hint-color, #6b6b6b);
    }
    :host(:where(:not(.ngu-unstyled))) .ngu-divider {
      border: 0;
      border-block-start: 1px solid var(--ngu-border-color, #c7c7c7);
      inline-size: 100%;
    }
  `,
})
export class NguGroup {
  readonly fields = input.required<FormDefinition>();
  readonly tree = input.required<Field<any>>();
  readonly cols = input<Cols>(1);
  readonly title = input<string>();
  readonly description = input<string>();
  /** `'tabs'` shows each child group or list as a tab. */
  readonly layout = input<'grid' | 'tabs'>('grid');
  /** Dot path of this group inside the form; empty at the root. */
  readonly path = input<string>('');
  /** Classes for the class map's slots inside this group, from its spec. */
  readonly classes = input<NguClassMap>();
  /** Classes for this group's host, from the `class` of its spec. */
  readonly styleClass = input<string>();

  private readonly outerLook = injectOuterLook();
  /** The look around this group with its `classes`; everything inside it reads this one. */
  readonly look = computed(() => extendLook(this.outerLook(), this.classes()));
  protected readonly hostClass = computed(() => slotClass(this.look(), 'group', this.styleClass()));

  /** Classes of static content: its slot, with the `class` of its spec. */
  protected staticClass(slot: 'title' | 'description', own: string | undefined): string {
    return slotClass(this.look(), slot, own);
  }

  protected readonly titleId = `ngu-group-${nextGroupId++}`;
  private readonly context = inject(NguFormContext, { optional: true });
  private readonly section = inject(NguSection, { optional: true });
  protected readonly i18n = this.context?.i18n ?? injectNguI18n();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly state = computed(() => this.tree()());
  /** Group-level errors (from `validate` on the group) show after submit, or once the group was edited. */
  protected readonly showErrors = computed(() => {
    // The root group's errors are form-level; <ngu-form> renders those.
    if (this.path() === '') {
      return false;
    }
    const s = this.state();
    if (s.errors().length === 0) {
      return false;
    }
    return this.errorsDue() || (s.touched() && s.dirty());
  });
  protected readonly message = computed(() => {
    const first = this.state().errors()[0];
    if (!first) {
      return undefined;
    }
    return first.message
      ? this.i18n.text(first.message)
      : this.i18n.message('invalid', { label: this.i18n.text(this.title()) ?? this.i18n.message('fieldFallback') });
  });

  constructor() {
    // Group-level errors join the error summary; the root group's belong to <ngu-form>.
    if (this.context) {
      const self = this;
      const unregister = this.context.register({
        id: this.titleId + '-msg',
        message: computed(() => (this.path() !== '' && this.state().errors().length ? this.message() : undefined)),
        element: this.host.nativeElement,
        get field() {
          return self.tree();
        },
        section: this.section,
        focus: () => {
          const host = this.host.nativeElement;
          host.scrollIntoView?.({ block: 'center' });
          host.querySelector<HTMLElement>(':scope > .ngu-error')?.focus({ preventScroll: true });
        },
      });
      inject(DestroyRef).onDestroy(unregister);
    }
  }

  /** Columns at the form's current width. */
  protected readonly columns = computed(() =>
    resolveCols(this.cols(), this.context?.width(), this.context?.breakpoints),
  );
  private readonly staticHidden = computed(() => this.state().metadata(NGU_STATIC_HIDDEN)?.() ?? {});

  protected readonly entries = computed<readonly Entry[]>(() => {
    const subtree = this.tree() as unknown as Record<string, Field<any>>;
    const base = this.path();
    const cols = this.columns();
    return ordered(this.fields()).map(([key, def]) => ({
      key,
      path: base ? base + '.' + key : key,
      def,
      tree: def.__ngu === 'static' ? undefined : subtree[key],
      column: column(def, cols),
      panel: (def.__ngu === 'group' || def.__ngu === 'array' || def.__ngu === 'dynamic') && def.collapsed !== undefined,
      title: 'title' in def ? def.title : undefined,
      inner: withoutTitle(def),
    }));
  });

  protected isHidden(entry: Entry): boolean {
    return entry.tree ? entry.tree().hidden() : Boolean(this.staticHidden()[entry.key]);
  }

  /** Errors show after a submit attempt, or after Next on the step this group is in. */
  private errorsDue(): boolean {
    return Boolean(this.context?.submitAttempted() || this.section?.attempted());
  }

  // --- tabs --------------------------------------------------------------------

  protected readonly tabs = computed(() => this.entries().filter((e) => e.tree && !e.tree().hidden()));

  /** Changes to the section that holds the first problem when a submit is refused. */
  private readonly chosenTab = linkedSignal<{ refusals: number; resets: number }, string | undefined>({
    source: () => ({ refusals: this.context?.refusals() ?? 0, resets: this.context?.resets() ?? 0 }),
    computation: (source, previous) => {
      if (!previous || previous.source.resets !== source.resets) {
        return undefined;
      }
      if (previous.source.refusals !== source.refusals) {
        return untracked(() => this.tabs().find((t) => t.tree!().invalid())?.key) ?? previous.value;
      }
      return previous.value;
    },
  });
  protected readonly activeTab = computed(() => {
    const list = this.tabs();
    const chosen = this.chosenTab();
    return list.some((t) => t.key === chosen) ? chosen : list[0]?.key;
  });

  protected selectTab(key: string): void {
    this.chosenTab.set(key);
  }

  // --- panels ------------------------------------------------------------------

  /** Open panels: those with `collapsed: false` at first, plus any with problems after a refused submit. */
  protected readonly openPanels = linkedSignal<{ refusals: number; resets: number }, ReadonlySet<string>>({
    source: () => ({ refusals: this.context?.refusals() ?? 0, resets: this.context?.resets() ?? 0 }),
    computation: (source, previous) => {
      if (!previous || previous.source.resets !== source.resets) {
        return untracked(() => new Set(this.entries().filter((e) => e.panel && !(e.def as { collapsed?: boolean }).collapsed).map((e) => e.key)));
      }
      if (previous.source.refusals !== source.refusals) {
        const invalid = untracked(() => this.entries().filter((e) => e.panel && e.tree!().invalid()));
        return invalid.length ? new Set([...previous.value, ...invalid.map((e) => e.key)]) : previous.value;
      }
      return previous.value;
    },
  });

  protected togglePanel(key: string): void {
    const next = new Set(this.openPanels());
    if (!next.delete(key)) {
      next.add(key);
    }
    this.openPanels.set(next);
  }

  protected openPanel(key: string): void {
    if (!this.openPanels().has(key)) {
      this.togglePanel(key);
    }
  }
}

function column(def: AnyFieldDef, cols: number): string | null {
  const span = Math.min(def.span ?? 1, cols);
  if (span > 1) {
    return `span ${span}`;
  }
  // Headings, paragraphs and dividers take a whole row unless they set a span.
  return def.__ngu === 'static' && cols > 1 ? '1 / -1' : null;
}
