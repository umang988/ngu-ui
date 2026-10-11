import type { HighlighterCore, ThemedToken } from 'shiki/core';

export type CodeLang = 'angular-ts' | 'angular-html' | 'bash' | 'json' | 'css';

export interface CodeToken {
  readonly content: string;
  /** `--shiki-light` and `--shiki-dark` colors; CSS picks one per theme. */
  readonly style: Readonly<Record<string, string>>;
}

const THEMES = { light: 'github-light-default', dark: 'github-dark-default' } as const;

/**
 * The code backgrounds each theme's colors must stay readable on: the darker of the two
 * light surfaces, and the lighter of the two dark ones (see styles.scss).
 */
const BACKGROUNDS = { light: '#eef1f5', dark: '#1c2540' } as const;
const MIN_CONTRAST = 4.6;

let highlighter: Promise<HighlighterCore> | undefined;

/**
 * Shiki, loaded on first use so the highlighter and its grammars stay out of the initial
 * bundle. The JavaScript regex engine avoids shipping WebAssembly.
 */
function load(): Promise<HighlighterCore> {
  highlighter ??= Promise.all([import('shiki/core'), import('shiki/engine/javascript')]).then(
    ([{ createHighlighterCore }, { createJavaScriptRegexEngine }]) =>
      createHighlighterCore({
        themes: [
          import('shiki/themes/github-light-default.mjs'),
          import('shiki/themes/github-dark-default.mjs'),
        ],
        langs: [
          import('shiki/langs/angular-ts.mjs'),
          import('shiki/langs/angular-html.mjs'),
          import('shiki/langs/bash.mjs'),
          import('shiki/langs/json.mjs'),
          import('shiki/langs/css.mjs'),
        ],
        engine: createJavaScriptRegexEngine(),
      }),
  );
  return highlighter;
}

/** Splits code into lines of colored tokens for both themes. */
export async function highlight(code: string, lang: CodeLang): Promise<CodeToken[][]> {
  const shiki = await load();
  const { tokens } = shiki.codeToTokens(code, { lang, themes: THEMES, defaultColor: false });
  return tokens.map((line: ThemedToken[]) =>
    line.map((t) => {
      const style = (t.htmlStyle ?? {}) as Record<string, string>;
      return {
        content: t.content,
        style: {
          ...style,
          '--shiki-light': readable(style['--shiki-light'], 'light'),
          '--shiki-dark': readable(style['--shiki-dark'], 'dark'),
        },
      };
    }),
  );
}

// ---------------------------------------------------------------------------
// Contrast: theme colors such as comments sit near 4:1 on our surfaces. Darken (light theme)
// or lighten (dark theme) any color below WCAG AA until it passes.
// ---------------------------------------------------------------------------

const fixed = new Map<string, string>();

function readable(color: string | undefined, theme: 'light' | 'dark'): string {
  if (!color || !/^#[0-9a-f]{6}/i.test(color)) {
    return color ?? '';
  }
  const key = theme + color;
  let result = fixed.get(key);
  if (!result) {
    const bg = rgb(BACKGROUNDS[theme]);
    let c = rgb(color);
    const target = theme === 'light' ? [0, 0, 0] : [255, 255, 255];
    for (let i = 0; i < 20 && contrast(c, bg) < MIN_CONTRAST; i++) {
      c = c.map((v, j) => Math.round(v + (target[j] - v) * 0.12));
    }
    result = '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
    fixed.set(key, result);
  }
  return result;
}

function rgb(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function luminance(c: number[]): number {
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: number[], b: number[]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
