# End-to-end tests

Playwright tests over the production builds of both docs sites, served the way Netlify serves
them (`serve.mjs`: files as themselves, every other path gets `index.html`).

| Project | Spec | What |
| --- | --- | --- |
| `site` | `site.spec.ts` | Every page of both sites, light and dark: renders, no console errors, no axe violations. Pages come from each site's sidebar. Chromium. |
| `chromium`, `firefox`, `webkit` | `keyboard.spec.ts`, `drafts.spec.ts`, `dropdown.spec.ts`, `recipes.spec.ts` | Keyboard-only flows, IndexedDB drafts across a reload, ngu-dropdown by keyboard, the autosave and admin recipes. |
| `ssr` | `ssr.spec.ts` | `projects/ssr-check` prerenders the examples; each page arrives with its form in the HTML and hydrates without mismatches. |
| `perf` | `perf.spec.ts` | A 500-field form (`/bench`): render time, no long tasks while typing, a full check under budget. Chromium. |
| `visual` | `visual.spec.ts` | One screenshot per field type of `/gallery`, light, dark and right to left. |

## Run

```sh
npm run build:dropdown                      # ngu-dropdown first: ngu-form/dropdown builds against it
npx ng build demo && npx ng build ngu-dropdown-demo && npx ng build ssr-check
npx playwright install chromium firefox webkit   # once
npm run e2e -- --project=chromium           # one project at a time on a small machine
npm run e2e -- --project=site
```

The config starts a server per site (ports 4321, 4322 and 4323) and reuses them if they already run.

## Screenshots

Baselines live in `snapshots/` and are made on Linux only, because fonts render differently
on each system. After a change that alters how fields look:

1. Push the branch.
2. Run the **Update screenshots** workflow on that branch (Actions tab). It builds the site,
   takes new screenshots in the same container CI uses, and commits them to the branch.
3. Look at the changed images in the pull request before merging.

On macOS or Windows, `NGU_VISUAL=1 npm run e2e -- --project=visual --update-snapshots=all`
makes baselines of your own (ignored by git), so you can compare before and after a change.
