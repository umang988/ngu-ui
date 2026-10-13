# Screenshot-to-form evals

Measures how well a coding agent builds a form with ngu-form from an image, with and without
the agent docs that ship in the package (`docs/`, the `AGENTS.md` block, the skills).

Each case in `cases/` is a design (`mockup.html`, rendered to `design.png`) and `case.json`: the
route, the prompt, and what the result must have (fields with their types and required marks,
fields that share a row, steps, tabs, lists, texts and buttons). Scoring reads the built page in
a browser, so it checks what users see, not how the code is written.

| Case | What it tests |
| --- | --- |
| `signup` | Two columns, email, password with hint, select, terms checkbox, full-width button |
| `checkout` | A three-step wizard, a three-column row, phone, segmented control |
| `job-application` | Section headings, prefixes, number, date, file upload, textarea with counter |
| `survey` | Rating, radio, checkbox group, slider, textarea, switch |
| `settings` | Tabs, prefix, selects in a row, Cancel beside Save |
| `invoice` | A list edited as a table with seeded rows, three fields in a row, dates |

## Running

The runner needs an Angular app to copy for each run, with the packed library and
`playwright-core` installed, and the Claude Code CLI.

```sh
npm run build:dropdown && npm run build:form
npx -y @angular/cli@22 new acme-app --defaults --skip-git --style=css --ssr=false --ai-config=none
(cd dist/ngu-form && npm pack --pack-destination /tmp)
(cd acme-app && npm install /tmp/ngu-form-*.tgz playwright-core@1.55.0)

node evals/agent-forms/run.mjs render --template acme-app            # cases/*/design.png
node evals/agent-forms/run.mjs run --template acme-app --work /tmp/evals \
  --variants none,agents --model sonnet --claude "$(which claude)"
```

`none` removes `docs/` and `skills/` from the installed package; `agents` runs
`ng g ngu-form:ai` first, as `ng add` does. Runs are sequential, every build the runner starts
waits for a slot from the machine's heavy-job guard, and processes an agent leaves in its app
folder are stopped afterwards. Each run leaves `claude.json`, `score.json`, `build.log`,
`render.png` and the agent's `src/` in `<work>/<run>/results/<case>-<variant>/`, and
`report.md` with one row per run.

Results of past runs are in `results/`.
