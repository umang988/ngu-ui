# ngu-ui workspace

Angular 22 workspace for three libraries, [`ngu-form`](projects/ngu-form/README.md),
[`ngu-dropdown`](projects/ngu-dropdown/README.md) and [`ngu-table`](projects/ngu-table/README.md),
and their docs sites.

| Path | What |
| --- | --- |
| `projects/ngu-form` | The ngu-form library (ng-packagr) and its schematics. |
| `projects/ngu-dropdown` | The ngu-dropdown library. |
| `projects/ngu-table` | The ngu-table library. |
| `projects/demo` | ngu-form's docs site, https://ngu-form.netlify.app. Imports the libraries from source. |
| `projects/ngu-dropdown-demo` | ngu-dropdown's docs site, https://ngu-dropdown.netlify.app. |
| `projects/ngu-table-demo` | ngu-table's docs site (`netlify.toml` ready, site not created yet). |
| `projects/docs-kit` | Shared docs shell, agent-docs generator and API reference generator. |
| `projects/size-check`, `projects/ssr-check` | Bundle size and server-rendering checks. Not deployed. |
| `e2e` | Playwright suites over the built sites ([README](e2e/README.md)). |
| `api` | Generated public API reports, compared in CI. |

Plans and progress: [ROADMAP.md](ROADMAP.md) for ngu-form and
[projects/ngu-table/ROADMAP.md](projects/ngu-table/ROADMAP.md) for ngu-table. How to work on it:
[CONTRIBUTING.md](CONTRIBUTING.md).

## Commands

```sh
npm start                      # ngu-form docs site on http://localhost:4200
npm run dropdown               # ngu-dropdown docs site on http://localhost:4301
npm run table                  # ngu-table docs site on http://localhost:4302
npm run build:dropdown         # dist/ngu-dropdown (build it first: ngu-form/dropdown uses it)
npm run build:form             # dist/ngu-form, its schematics and agent docs
npm run build:table            # dist/ngu-table
npx ng test ngu-form --watch=false --include=projects/ngu-form/src/lib/define.spec.ts
npm run lint
npm run api:check              # after the builds: API report and TSDoc coverage
node scripts/size.mjs --build --check
npm run e2e -- --project=chromium   # after building the sites; see e2e/README.md
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

Releases run from GitHub Actions: bump the version, date the changelog section, then run the
**Release** workflow on `main`. It publishes with npm provenance, tags the commit and creates a
GitHub release. See [CONTRIBUTING.md](CONTRIBUTING.md#releases).
