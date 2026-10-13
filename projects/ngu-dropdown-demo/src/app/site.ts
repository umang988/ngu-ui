import type { DocsSite } from 'docs-kit/site';
import { NAV } from './nav';
import { VERSION } from './version';

export const SITE: DocsSite = {
  name: 'ngu-dropdown',
  version: VERSION,
  nav: NAV,
  links: [
    { label: 'Docs', path: '/introduction' },
    { label: 'API', path: '/api/dropdown', match: '/api' },
  ],
  footer: {
    text: 'MIT licensed · server paging, virtual scrolling, every Angular form API.',
    links: [
      { label: 'Installation', path: '/installation' },
      { label: 'Changelog', path: '/changelog' },
      { label: 'API', path: '/api/dropdown' },
    ],
  },
  stackblitz: {
    angular: '^22.2.0',
    typescript: '~6.0.2',
    dependencies: { 'ngu-dropdown': `^${VERSION}` },
  },
  sourceDir: 'projects/ngu-dropdown',
};
