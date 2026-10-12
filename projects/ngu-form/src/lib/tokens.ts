/** One CSS custom property that ngu-form's default theme reads. */
export interface NguToken {
  /** The property, such as `--ngu-primary`. */
  readonly name: `--ngu-${string}`;
  /** The value used when the property is not set. */
  readonly default: string;
  /** What it styles. */
  readonly use: string;
  readonly group: 'color' | 'shape' | 'space' | 'text' | 'parts';
  /** True when `density` or `size` changes the default. */
  readonly scaled?: boolean;
}

/**
 * Every CSS custom property of the default theme. Set them on `<ngu-form>` or any ancestor;
 * `density` and `size` only change the defaults of the `scaled` ones, so values you set win.
 */
export const NGU_TOKENS: readonly NguToken[] = [
  { name: '--ngu-primary', default: '#1a73e8', use: 'Submit button, add buttons, chosen segments, switches', group: 'color' },
  { name: '--ngu-on-primary', default: '#fff', use: 'Text on the submit button and chosen segments', group: 'color' },
  { name: '--ngu-focus-color', default: '#1a73e8', use: 'Focus rings', group: 'color' },
  { name: '--ngu-border-color', default: '#c7c7c7', use: 'Input borders, list rows, dividers', group: 'color' },
  { name: '--ngu-input-bg', default: 'transparent', use: 'Input background', group: 'color' },
  { name: '--ngu-readonly-bg', default: 'rgba(127, 127, 127, 0.08)', use: 'Read-only and computed inputs', group: 'color' },
  { name: '--ngu-label-color', default: 'inherit', use: 'Label text', group: 'color' },
  { name: '--ngu-hint-color', default: '#6b6b6b', use: 'Hints, counters, descriptions', group: 'color' },
  { name: '--ngu-error-color', default: '#c62828', use: 'Error text and invalid borders', group: 'color' },
  { name: '--ngu-error-bg', default: '#fdecea', use: 'The form-level error box', group: 'color' },
  { name: '--ngu-warning-color', default: '#8a5300', use: 'Warning text, its icon and border', group: 'color' },
  { name: '--ngu-warning-on', default: '#fff', use: 'The "!" inside the warning icon', group: 'color' },
  { name: '--ngu-success-color', default: '#1e7a3c', use: 'Met password rules and a strong meter', group: 'color' },
  { name: '--ngu-skeleton-color', default: 'rgba(127, 127, 127, 0.16)', use: 'Loading placeholders and the empty meter', group: 'color' },
  { name: '--ngu-notice-bg', default: 'rgba(127, 127, 127, 0.08)', use: 'The "draft restored" notice', group: 'color' },
  { name: '--ngu-surface', default: '#fff', use: 'Dialogs and popovers, such as the crop dialog', group: 'color' },
  { name: '--ngu-switch-off', default: '#767676', use: 'A switch that is off', group: 'color' },
  { name: '--ngu-rating-color', default: '#b25f00', use: 'Filled rating stars', group: 'color' },
  { name: '--ngu-tag-bg', default: 'rgba(127, 127, 127, 0.14)', use: 'Tags', group: 'color' },
  { name: '--ngu-drop-bg', default: 'rgba(26, 115, 232, 0.08)', use: 'A file drop zone while dragging', group: 'color' },

  { name: '--ngu-radius', default: '0.375rem', use: 'Corners of inputs, buttons and rows', group: 'shape' },

  { name: '--ngu-gap', default: '1rem', use: 'Space between fields and rows', group: 'space', scaled: true },
  { name: '--ngu-field-gap', default: '0.375rem', use: 'Space between a label, its control and its message', group: 'space', scaled: true },
  { name: '--ngu-input-padding', default: '0.5rem 0.75rem', use: 'Padding inside inputs', group: 'space', scaled: true },
  { name: '--ngu-button-padding', default: '0.5rem 1.25rem', use: 'Padding inside buttons', group: 'space', scaled: true },
  { name: '--ngu-row-padding', default: '0.75rem', use: 'Padding inside list rows', group: 'space', scaled: true },
  { name: '--ngu-actions-justify', default: 'flex-start', use: 'Alignment of the submit button', group: 'space' },
  { name: '--ngu-list-height', default: '32rem', use: 'Height of a long list (`virtual: true`)', group: 'space' },
  { name: '--ngu-view-column', default: '14rem', use: 'Narrowest column of `<ngu-view>`', group: 'space' },

  { name: '--ngu-font-size', default: 'inherited', use: 'Text size of the form and its controls', group: 'text', scaled: true },
  { name: '--ngu-label-size', default: '0.875rem', use: 'Label text size', group: 'text', scaled: true },
  { name: '--ngu-title-size', default: '1rem', use: 'Group, list and heading size', group: 'text' },
  { name: '--ngu-textarea-line-height', default: '1.5', use: 'Textarea lines, used by autosize', group: 'text' },
  { name: '--ngu-mono', default: 'ui-monospace, monospace', use: 'One-time code boxes and color values', group: 'text' },
];

/** Custom properties ngu-form sets itself, from the spec; not meant to be set by apps. */
export const NGU_INTERNAL_PROPERTIES: readonly string[] = [
  '--ngu-cols',
  '--ngu-otp-length',
  '--ngu-strength-fill',
  '--ngu-strength-color',
];
