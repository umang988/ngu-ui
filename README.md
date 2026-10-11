# ngu-form workspace

Angular 22 workspace for the `ngu-form` library and its demo app.

| Path | What |
| --- | --- |
| `projects/ngu-form` | The publishable library (ng-packagr). See its [README](projects/ngu-form/README.md). |
| `projects/demo` | Demo app that imports the library from source. |

Plans and progress: [ROADMAP.md](ROADMAP.md).

## Commands

```sh
npm start                      # serve the demo on http://localhost:4200
npm run build -- ngu-form      # build the library into dist/ngu-form
npm run build -- demo          # build the demo
npx ng test ngu-form           # library specs (vitest)
npx ng test demo               # demo specs
```

The root `tsconfig.json` maps `ngu-form` to `projects/ngu-form/src/public-api.ts`,
so the demo compiles against the library source without a prior library build.

## Demo site

The demo is the documentation site, laid out like PrimeNG's: a sidebar of groups, one page
per topic and field type with live demos, a Features and API view, "On this page" and
search (Ctrl K). Home and the examples sit beside it.

| Path | What |
| --- | --- |
| `projects/demo/src/app/docs/nav.ts` | The sidebar, in reading order. Each entry is a route and lazy-loads its page. |
| `projects/demo/src/app/docs/content/` | Page content: sections, text, tables and API options, one file per sidebar group. |
| `projects/demo/src/app/docs/demos/` | One small component per live demo. Copied to `/source/docs/` at build time, so the code under each demo is the file that runs. |
| `projects/demo/src/app/docs/` | The page template, demo card, "On this page", search and sidebar. |
| `projects/demo/src/app/examples/` | The complete example forms, copied to `/source/` the same way. |
| `projects/demo/src/app/pages/` | Home and the example page with its registry (`examples.ts`). |
| `projects/demo/src/app/ui/` | Code blocks highlighted with [Shiki](https://shiki.style) (loaded lazily), code tabs, theme toggle. |

To add a page: add a demo under `docs/demos/<page>/`, a page under `docs/content/`, and an
entry in `docs/nav.ts`. The header version comes from `projects/ngu-form/package.json`.

After changing `angular.json`, restart `ng serve`; the dev server does not reload it.

## Publish

```sh
npx ng build ngu-form
cd dist/ngu-form
npm publish --access public
```
