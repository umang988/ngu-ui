# Contributing

Thanks for helping with ngu-form, ngu-dropdown and ngu-table. This repository holds the three
libraries, their docs sites, and the tools around them. Please read the [code of conduct](CODE_OF_CONDUCT.md)
first, and report security problems privately as [SECURITY.md](SECURITY.md) explains.

## Before you start

- **Bugs:** open an issue with a reproduction. A StackBlitz link from any docs demo ("Open in
  StackBlitz") is the quickest way to share one.
- **Features and API changes:** open an issue first, so we can agree on the API before you
  write code. ngu-form's API is small on purpose; [ROADMAP.md](ROADMAP.md) lists what is
  planned and what is not.
- **Docs fixes and typos:** a pull request is fine on its own.

## Set up

Node.js 24 and npm 11.

```sh
git clone https://github.com/umang988/ngu-ui.git
cd ngu-ui
npm ci
npm start                 # ngu-form docs site on http://localhost:4200
npm run dropdown          # ngu-dropdown docs site on http://localhost:4301
npm run table             # ngu-table docs site on http://localhost:4302
```

The docs sites import the libraries from source, so a change in `projects/ngu-form/src` shows
up right away.

## Where things are

| Path | What |
| --- | --- |
| `projects/ngu-form` | The ngu-form library: `src/` is the main entry point, and `upload/`, `material/`, `primeng/`, `dropdown/`, `tailwind/`, `testing/`, `playwright/` and `debug/` are the others. `schematics/` holds `ng add` and the generators. |
| `projects/ngu-dropdown` | The ngu-dropdown library. |
| `projects/ngu-table` | The ngu-table library. Its plans are in its own [ROADMAP.md](projects/ngu-table/ROADMAP.md). |
| `projects/demo` | ngu-form's docs site. Pages are data in `src/app/docs/content`, demos in `src/app/docs/demos`, complete examples in `src/app/examples`. |
| `projects/ngu-dropdown-demo` | ngu-dropdown's docs site. |
| `projects/ngu-table-demo` | ngu-table's docs site. |
| `projects/docs-kit` | The shared docs shell, the agent-docs generator and the API reference generator. Not published. |
| `projects/size-check`, `projects/ssr-check` | Small apps for the bundle size check and the server-rendering check. Not deployed. |
| `e2e` | Playwright tests over the built docs sites. See [e2e/README.md](e2e/README.md). |
| `api` | The public API of each package, generated. CI fails when it differs from the build. |

## Make a change

1. Write a spec that fails without your change, including at least one failure path.
2. Make the change. Public types get TSDoc; the API reference and the AI-agent docs are built
   from it.
3. Show it in the docs: a demo in `projects/demo/src/app/docs/demos` and a section in
   `src/app/docs/content`, or a code sample.
4. Add an entry to the package's `CHANGELOG.md` under the next version. Breaking changes need
   a migration note.

The full list is the [definition of done](ROADMAP.md#definition-of-done).

## Check it

Run the spec files you touched rather than whole suites; CI runs everything.

```sh
npx ng test ngu-form --watch=false --include=projects/ngu-form/src/lib/validation.spec.ts
npx ng test ngu-dropdown --watch=false --include=projects/ngu-dropdown/src/lib/dropdown.spec.ts
npx ng test ngu-table --watch=false --include=projects/ngu-table/src/lib/fetch.spec.ts
npm run lint
```

When you change the public API, build the libraries and update the API report, then commit
the changed files in `api/` and `projects/demo/src/app/docs/content/reference/`:

```sh
npm run build:dropdown && npm run build:form && npm run build:table
npm run api:update        # or api:check, which CI runs
```

For the browser tests, build the sites first; [e2e/README.md](e2e/README.md) has the details.

```sh
npx ng build demo && npx ng build ngu-dropdown-demo && npx ng build ngu-table-demo && npx ng build ssr-check
npx playwright install chromium firefox webkit   # once
npm run e2e -- --project=chromium
```

`node scripts/size.mjs --build --check` measures what ngu-form adds to an app's initial
JavaScript and fails above the budget in `projects/size-check/budget.json`.

## Style

- Formatting follows `.prettierrc` (100 columns, single quotes). ESLint (`npm run lint`) checks
  code and templates, including the template accessibility rules.
- Comments and docs are plain English: short sentences, present tense, what the code does and
  why. Backticks for code.
- Components use `OnPush`, signals and `input()`/`output()`. No new runtime dependencies.
- Every visible part keeps working by keyboard, and axe reports nothing on the docs pages.

## Pull requests

- One change per pull request, with a description of what and why. The template lists the
  checks.
- CI must be green: lint, unit tests, builds, API report, bundle size, and the Playwright
  suites in Chromium, Firefox and WebKit.
- A change that alters how fields look needs new screenshot baselines: run the **Update
  screenshots** workflow on your branch and review the images.

## Releases

Maintainers release from `main` with the **Release** workflow, which publishes to npm with
provenance, tags the commit and creates a GitHub release from the changelog. Version numbers
follow the [versioning policy](https://ngu-form.netlify.app/versioning).
