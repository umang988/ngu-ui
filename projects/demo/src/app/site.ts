import type { DocsSite } from 'docs-kit/site';
import { NAV } from './docs/nav';
import { DROPDOWN_VERSION, VERSION } from './version';

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
  stackblitz: {
    angular: '^22.2.0',
    typescript: '~6.0.2',
    dependencies: { 'ngu-form': `^${VERSION}`, 'ngu-dropdown': `^${DROPDOWN_VERSION}`, zod: '^4.6.5' },
  },
  sourceDir: 'projects/ngu-form',
};
