/**
 * True when a model value matches an option value. Option values keep their type when
 * written, but a model that holds `'1'` for a numeric option (from older data, or a native
 * input) still shows that option as chosen.
 */
export function sameChoice(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  return (
    a !== null &&
    b !== null &&
    typeof a !== 'object' &&
    typeof b !== 'object' &&
    typeof a !== typeof b &&
    String(a) === String(b)
  );
}

/** Visually hidden but read by screen readers; shared by the built-in controls. */
export const SR_ONLY = `
  .ngu-sr-only {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;
