import { navEntries, type NavGroup } from 'docs-kit/site';
import { EXAMPLES } from '../pages/example/examples';

const start = (key: string) => () => import('./content/getting-started').then((m) => m.PAGES[key]);
const forms = (key: string) => () => import('./content/forms').then((m) => m.PAGES[key]);
const types = (key: string) => () => import('./content/field-types').then((m) => m.PAGES[key]);
const uploads = (key: string) => () => import('./content/uploads').then((m) => m.PAGES[key]);
const custom = (key: string) => () => import('./content/customization').then((m) => m.PAGES[key]);
const api = (key: string) => () => import('./content/api').then((m) => m.PAGES[key]);
const systems = (key: string) => () => import('./content/design-systems').then((m) => m.PAGES[key]);
const tools = (key: string) => () => import('./content/tools').then((m) => m.PAGES[key]);
const migration = (key: string) => () => import('./content/migration').then((m) => m.PAGES[key]);

/** The sidebar, in reading order. Previous and next links follow it too. */
export const NAV: readonly NavGroup[] = [
  {
    title: 'Getting started',
    items: [
      { title: 'Introduction', path: 'introduction', load: start('introduction') },
      { title: 'Installation', path: 'installation', load: start('installation') },
      { title: 'Configuration', path: 'configuration', load: start('configuration') },
      { title: 'Changelog', path: 'changelog', load: start('changelog') },
    ],
  },
  {
    title: 'Building forms',
    items: [
      { title: 'Defining a form', path: 'defining-forms', load: forms('defining-forms') },
      { title: 'Layout', path: 'layout', load: forms('layout') },
      { title: 'Tabs and accordion', path: 'sections', load: forms('sections') },
      { title: 'Steps', path: 'steps', load: forms('steps') },
      { title: 'Lists', path: 'lists', load: forms('lists') },
      { title: 'Run-time fields', path: 'runtime-fields', load: forms('runtime-fields') },
      { title: 'Dependent values', path: 'dependent-values', load: forms('dependent-values') },
      { title: 'Validation', path: 'validation', load: forms('validation') },
      { title: 'Schemas and warnings', path: 'schemas', load: forms('schemas') },
      { title: 'Masks and formats', path: 'masks', load: forms('masks') },
      { title: 'Submitting', path: 'submitting', load: forms('submitting') },
      { title: 'Form state', path: 'form-state', load: forms('form-state') },
      { title: 'View mode', path: 'view-mode', load: forms('view-mode') },
      { title: 'Loading, drafts and undo', path: 'persistence', load: forms('persistence') },
    ],
  },
  {
    title: 'Field types',
    items: [
      { title: 'Text', path: 'text', load: types('text') },
      { title: 'Number', path: 'number', load: types('number') },
      { title: 'Currency', path: 'currency', load: types('currency') },
      { title: 'Slider', path: 'slider', load: types('slider') },
      { title: 'Rating', path: 'rating', load: types('rating') },
      { title: 'Checkbox and switch', path: 'checkbox', load: types('checkbox') },
      { title: 'Checkbox group', path: 'checkbox-group', load: types('checkbox-group') },
      { title: 'Radio and segmented', path: 'radio', load: types('radio') },
      { title: 'Select', path: 'select', load: types('select') },
      { title: 'Date', path: 'date', load: types('date') },
      { title: 'Time, month and week', path: 'time', load: types('time') },
      { title: 'Date range', path: 'date-range', load: types('date-range') },
      { title: 'Phone', path: 'phone', load: types('phone') },
      { title: 'One-time code', path: 'otp', load: types('otp') },
      { title: 'Tags', path: 'tags', load: types('tags') },
      { title: 'URL, search and color', path: 'url', load: types('url') },
      { title: 'Consent', path: 'consent', load: types('consent') },
      { title: 'Captcha', path: 'captcha', load: types('captcha') },
      { title: 'Server dropdown', path: 'dropdown', load: types('dropdown') },
    ],
  },
  {
    title: 'Uploads',
    items: [
      { title: 'File upload', path: 'file-upload', load: uploads('file-upload') },
      { title: 'Image', path: 'image', load: uploads('image') },
      { title: 'Signature', path: 'signature', load: uploads('signature') },
    ],
  },
  {
    title: 'Customization',
    items: [
      { title: 'Custom types', path: 'custom-types', load: custom('custom-types') },
      { title: 'Overrides', path: 'overrides', load: custom('overrides') },
      { title: 'Theming', path: 'theming', load: custom('theming') },
      { title: 'Icons', path: 'icons', load: custom('icons') },
      { title: 'Messages and languages', path: 'languages', load: custom('languages') },
      { title: 'Accessibility', path: 'accessibility', load: custom('accessibility') },
    ],
  },
  {
    title: 'Design systems',
    items: [
      { title: 'Angular Material', path: 'material', load: systems('material') },
      { title: 'PrimeNG', path: 'primeng', load: systems('primeng') },
      { title: 'Unstyled and Tailwind', path: 'tailwind', load: systems('tailwind') },
      { title: 'Renderers', path: 'renderers', load: systems('renderers') },
    ],
  },
  {
    title: 'Tools',
    items: [
      { title: 'Testing', path: 'testing', load: tools('testing') },
      { title: 'Schematics', path: 'schematics', load: tools('schematics') },
      { title: 'Debug panel', path: 'debug', load: tools('debug') },
      { title: 'Single fields', path: 'single-field', load: tools('single-field') },
      { title: 'Diagnostics', path: 'diagnostics', load: tools('diagnostics') },
    ],
  },
  {
    title: 'Migration',
    items: [
      { title: 'From ngx-formly', path: 'from-formly', load: migration('from-formly') },
      { title: 'From reactive forms', path: 'from-reactive-forms', load: migration('from-reactive-forms') },
    ],
  },
  {
    title: 'Examples',
    items: EXAMPLES.map((e) => ({ title: e.title, path: `examples/${e.id}` })),
  },
  {
    title: 'API',
    items: [
      { title: 'defineForm', path: 'api/define-form', load: api('define-form') },
      { title: 'Spec options', path: 'api/spec', load: api('spec') },
      { title: '<ngu-form>', path: 'api/ngu-form', load: api('ngu-form') },
      { title: '<ngu-view>', path: 'api/ngu-view', load: api('ngu-view') },
      { title: 'Providers and helpers', path: 'api/providers', load: api('providers') },
    ],
  },
];

/** Every page in sidebar order. */
export const NAV_ENTRIES = navEntries(NAV);
