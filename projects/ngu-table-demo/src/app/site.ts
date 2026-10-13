import type { DocsSite } from 'docs-kit/site';
import { NAV } from './nav';
import { VERSION } from './version';

export const SITE: DocsSite = {
  name: 'ngu-table',
  version: VERSION,
  nav: NAV,
  links: [
    { label: 'Docs', path: '/introduction' },
    { label: 'API', path: '/api/table', match: '/api' },
  ],
  footer: {
    text: 'MIT licensed · server paging, search, filters, typed cells and row actions.',
    links: [
      { label: 'Installation', path: '/installation' },
      { label: 'Changelog', path: '/changelog' },
      { label: 'API', path: '/api/table' },
    ],
  },
  stackblitz: {
    angular: '^22.2.0',
    typescript: '~6.0.2',
    dependencies: { 'ngu-table': `^${VERSION}` },
  },
  sourceDir: 'projects/ngu-table',
};
