import { navEntries, type NavGroup } from 'docs-kit/site';

const start = (key: string) => () => import('./content/getting-started').then((m) => m.PAGES[key]);
const guide = (key: string) => () => import('./content/guides').then((m) => m.PAGES[key]);
const api = (key: string) => () => import('./content/api').then((m) => m.PAGES[key]);

/** The sidebar, in reading order. Previous and next links follow it too. */
export const NAV: readonly NavGroup[] = [
  {
    title: 'Getting started',
    items: [
      { title: 'Introduction', path: 'introduction', load: start('introduction') },
      { title: 'Installation', path: 'installation', load: start('installation') },
      { title: 'AI coding agents', path: 'ai-agents', load: start('ai-agents') },
      { title: 'Changelog', path: 'changelog', load: start('changelog') },
    ],
  },
  {
    title: 'Guides',
    items: [
      { title: 'Server data', path: 'server-data', load: guide('server-data') },
      { title: 'Static options', path: 'static-options', load: guide('static-options') },
      { title: 'Selection', path: 'selection', load: guide('selection') },
      { title: 'Forms', path: 'forms', load: guide('forms') },
      { title: 'Templates', path: 'templates', load: guide('templates') },
      { title: 'Text and translations', path: 'messages', load: guide('messages') },
      { title: 'Theming', path: 'theming', load: guide('theming') },
      { title: 'Accessibility', path: 'accessibility', load: guide('accessibility') },
    ],
  },
  {
    title: 'API',
    items: [
      { title: '<ngu-dropdown>', path: 'api/dropdown', load: api('dropdown') },
      { title: 'Config and types', path: 'api/types', load: api('types') },
    ],
  },
];

/** Every page in sidebar order. */
export const NAV_ENTRIES = navEntries(NAV);
