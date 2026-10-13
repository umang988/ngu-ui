import { InjectionToken, inject, type Provider, type Signal } from '@angular/core';
import type { NgControl } from '@angular/forms';

/** Every built-in string. Functions take the number they describe, for plurals. */
export interface NguDropdownMessages {
  /** Shown in the closed control while nothing is chosen. Default `Select…`. */
  placeholder: string;
  /** Placeholder and accessible name of the search box. Default `Search…`. */
  searchPlaceholder: string;
  /** Heading of the notice shown when the list has no rows. Default `Nothing to pick`. */
  emptyTitle: string;
  /** Text under `emptyTitle`. Default `No options match what you typed.` */
  emptyMessage: string;
  /** Heading of the notice a failed `fetchFn` shows. Default `Could not load these options`. */
  errorTitle: string;
  /** Text under `errorTitle`. Default `The request failed. It may just be the connection.` */
  errorMessage: string;
  /** The error notice's button, which asks again. Default `Try again`. */
  retry: string;
  /** Shown in the footer while a page loads. Default `Loading…`. */
  loading: string;
  /** Accessible name of the clear button. Default `Clear selection`. */
  clear: string;
  /** The footer's total, such as "1,204 options". */
  count: (count: number) => string;
  /** The footer's selection count in multiple mode. */
  selected: (count: number) => string;
  /** The chip that stands for the chips that did not fit. */
  more: (count: number) => string;
}

/**
 * Remembers the rows behind chosen keys per form control, so a control restored from a saved
 * draft can still show names. `control` is the `NgControl` the dropdown is bound to.
 */
export interface NguDropdownRowMemory {
  /**
   * Called with the row behind each chosen key as the dropdown learns it: from a pick, a
   * loaded page, `lookupFn` or `selectedOption`.
   */
  remember(control: NgControl, key: unknown, row: unknown): void;
  /** The row remembered for `key`, or `undefined`. */
  recall(control: NgControl, key: unknown): unknown;
}

/**
 * Defaults for every `<ngu-dropdown>` under an injector, passed to `provideNguDropdownConfig`.
 * Options left out keep the parent injector's value, or the built-in default.
 */
export interface NguDropdownConfig {
  /** Replaces some or all built-in strings. A signal switches language live. */
  messages?: Partial<NguDropdownMessages> | Signal<Partial<NguDropdownMessages>>;
  /** Default `optionValue` path. Default `'value'`. */
  optionValue?: string;
  /** Default `optionLabel` path. Default `'label'`. */
  optionLabel?: string;
  /** Rows per request. Default 50. */
  pageSize?: number;
  /** Row height in px. Default 36. */
  optionHeight?: number;
  /** Panel height ceiling in px. Default 320. Below the field the panel keeps at least 160px. */
  panelMaxHeight?: number;
  /** Search debounce in ms. Default 300. */
  searchDebounce?: number;
  /** Client lists longer than this show a search box. Default 8. */
  searchThreshold?: number;
  /**
   * Remembers the rows behind chosen keys per form control, so a value restored into the
   * control, such as a saved draft, still shows names. Used only with a form directive.
   */
  rowMemory?: NguDropdownRowMemory;
}

/** The config with every default filled in and the messages merged across injectors. */
export interface ResolvedNguDropdownConfig {
  messages: () => NguDropdownMessages;
  optionValue: string;
  optionLabel: string;
  pageSize: number;
  optionHeight: number;
  panelMaxHeight: number;
  searchDebounce: number;
  searchThreshold: number;
  rowMemory: NguDropdownRowMemory | null;
}

const number = (n: number) => n.toLocaleString();

export const DEFAULT_MESSAGES: NguDropdownMessages = {
  placeholder: 'Select…',
  searchPlaceholder: 'Search…',
  emptyTitle: 'Nothing to pick',
  emptyMessage: 'No options match what you typed.',
  errorTitle: 'Could not load these options',
  errorMessage: 'The request failed. It may just be the connection.',
  retry: 'Try again',
  loading: 'Loading…',
  clear: 'Clear selection',
  count: (n) => `${number(n)} ${n === 1 ? 'option' : 'options'}`,
  selected: (n) => `${number(n)} selected`,
  more: (n) => `+${number(n)} more`,
};

const ROOT: ResolvedNguDropdownConfig = {
  messages: () => DEFAULT_MESSAGES,
  optionValue: 'value',
  optionLabel: 'label',
  pageSize: 50,
  optionHeight: 36,
  panelMaxHeight: 320,
  searchDebounce: 300,
  searchThreshold: 8,
  rowMemory: null,
};

export const NGU_DROPDOWN_CONFIG = new InjectionToken<ResolvedNguDropdownConfig>(
  'NGU_DROPDOWN_CONFIG',
  { providedIn: 'root', factory: () => ROOT },
);

/**
 * Sets defaults for every `<ngu-dropdown>` under this injector. Nested calls merge, so a
 * route can replace one message and keep the app's others.
 */
export function provideNguDropdownConfig(config: NguDropdownConfig): Provider {
  return {
    provide: NGU_DROPDOWN_CONFIG,
    useFactory: (): ResolvedNguDropdownConfig => {
      const parent = inject(NGU_DROPDOWN_CONFIG, { skipSelf: true, optional: true }) ?? ROOT;
      const { messages, ...rest } = config;
      const own = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));

      return {
        ...parent,
        ...own,
        messages: () => ({
          ...parent.messages(),
          ...(typeof messages === 'function' ? messages() : messages),
        }),
      };
    },
  };
}
