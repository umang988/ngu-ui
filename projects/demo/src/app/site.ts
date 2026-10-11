import type { DocsSite } from 'docs-kit/site';
import { NAV } from './docs/nav';
import { VERSION } from './version';

export const SITE: DocsSite = {
  name: 'ngu-form',
  version: VERSION,
  nav: NAV,
  links: [
    { label: 'Docs', path: '/introduction' },
    { label: 'Examples', path: '/examples', match: '/examples' },
    { label: 'API', path: '/api/define-form', match: '/api' },
  ],
  footer: {
    text: 'MIT licensed · built on Angular Signal Forms.',
    links: [
      { label: 'Installation', path: '/installation' },
      { label: 'Changelog', path: '/changelog' },
      { label: 'Examples', path: '/examples' },
    ],
  },
  sourceDir: 'projects/ngu-form',
};
