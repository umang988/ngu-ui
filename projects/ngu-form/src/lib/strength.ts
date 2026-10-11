import type { StrengthOptions } from './types';

/** Built-in checklist rules; labels come from the messages so they translate. */
export type DefaultRuleId = 'length' | 'case' | 'number' | 'symbol';

export const DEFAULT_PASSWORD_LENGTH = 8;

export function defaultRuleTests(minLength: number): readonly { id: DefaultRuleId; test: (v: string) => boolean }[] {
  return [
    { id: 'length', test: (v) => [...v].length >= minLength },
    // Scripts without case (Devanagari, Arabic) count as meeting the case rule.
    { id: 'case', test: (v) => (/\p{Ll}/u.test(v) && /\p{Lu}/u.test(v)) || /\p{Lo}/u.test(v) },
    { id: 'number', test: (v) => /\p{Nd}/u.test(v) },
    // Combining marks (Devanagari vowel signs, Arabic harakat) belong to letters, not symbols.
    { id: 'symbol', test: (v) => /[^\p{L}\p{M}\p{Nd}\s]/u.test(v) },
  ];
}

export function strengthOptions(strength: boolean | StrengthOptions | undefined): StrengthOptions | undefined {
  if (!strength) {
    return undefined;
  }
  return strength === true ? {} : strength;
}

/**
 * Score from 0 (too weak) to 4 (strong). With the default rules it is the number of rules
 * met, at most 1 while the password is too short, plus a point each for 1.5× and 2× the
 * minimum length, so long passphrases score well without symbols.
 */
export function passwordScore(value: string, options: StrengthOptions, minLength = DEFAULT_PASSWORD_LENGTH): number {
  if (!value) {
    return 0;
  }
  if (options.score) {
    return clamp(Math.round(options.score(value)));
  }
  if (options.rules?.length) {
    const met = options.rules.filter((r) => r.test(value)).length;
    return clamp(Math.round((4 * met) / options.rules.length));
  }
  const tests = defaultRuleTests(minLength);
  const met = tests.filter((t) => t.test(value)).length;
  if (!tests[0].test(value)) {
    return Math.min(met, 1);
  }
  const length = [...value].length;
  const bonus = (length >= minLength * 1.5 ? 1 : 0) + (length >= minLength * 2 ? 1 : 0);
  return clamp(met + bonus);
}

function clamp(n: number): number {
  return Math.max(0, Math.min(4, n));
}
