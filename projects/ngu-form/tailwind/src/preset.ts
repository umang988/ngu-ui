import type { NguClassMap } from 'ngu-form';

/**
 * A complete Tailwind 4 look for ngu-form, as a class map. Use it with `theme: 'none'`, and
 * import `ngu-form/tailwind.css` after Tailwind so these classes are generated and the
 * `ngu-accent` color exists:
 *
 * ```ts
 * provideNguFormConfig({ theme: 'none', classes: nguTailwind })
 * ```
 *
 * Change a slot with a spread, `{ ...nguTailwind, submit: '…' }`, or add to one per form and
 * per field with `classes`. Colors follow Tailwind's `dark:` variant.
 */
export const nguTailwind: Required<NguClassMap> = {
  form: 'flex flex-col gap-6',
  field: 'flex min-w-0 flex-col gap-1.5',
  label:
    'text-sm/6 font-medium text-zinc-900 has-[input]:flex has-[input]:items-center has-[input]:gap-2.5 dark:text-zinc-100 [&_.ngu-required]:ms-0.5 [&_.ngu-required]:text-red-600 dark:[&_.ngu-required]:text-red-400',
  control:
    'block w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm/6 text-zinc-900 shadow-xs placeholder:text-zinc-400 focus:border-ngu-accent focus:ring-3 focus:ring-ngu-accent/20 focus:outline-hidden disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500 read-only:bg-zinc-50 aria-invalid:border-red-500 aria-invalid:focus:ring-red-500/20 data-adorned:rounded-none data-adorned:border-0 data-adorned:bg-transparent data-adorned:px-2 data-adorned:shadow-none data-adorned:focus:ring-0 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-zinc-500 dark:disabled:bg-white/10 dark:read-only:bg-white/10 dark:aria-invalid:border-red-400',
  check: 'size-4 shrink-0 cursor-pointer accent-ngu-accent disabled:cursor-not-allowed',
  hint: 'text-sm text-zinc-500 dark:text-zinc-400',
  warning: 'text-sm text-amber-700 dark:text-amber-400',
  error: 'text-sm font-medium text-red-600 dark:text-red-400',
  adorned:
    'flex items-center rounded-lg border border-zinc-300 bg-white shadow-xs focus-within:border-ngu-accent focus-within:ring-3 focus-within:ring-ngu-accent/20 has-[[aria-invalid=true]]:border-red-500 dark:border-white/15 dark:bg-white/5 dark:has-[[aria-invalid=true]]:border-red-400 [&>button]:me-1 [&>button]:border-0 [&>button]:bg-transparent [&>button]:shadow-none [&>button]:text-ngu-accent dark:[&>button]:text-zinc-200',
  affix: 'flex shrink-0 items-center text-sm text-zinc-500 select-none first:ps-3 last:pe-3 dark:text-zinc-400 [&_svg]:size-4',
  option: 'flex items-center gap-2.5 py-1 text-sm text-zinc-900 has-disabled:opacity-50 dark:text-zinc-100',
  chip: 'me-1.5 mb-1.5 inline-flex items-center gap-1 rounded-md bg-zinc-100 py-0.5 ps-2 pe-1 text-sm text-zinc-800 dark:bg-white/10 dark:text-zinc-100 [&_button]:rounded [&_button]:px-1 [&_button]:text-zinc-500 [&_button]:hover:text-zinc-900 dark:[&_button]:hover:text-white',
  group: 'flex min-w-0 flex-col gap-3 [&>.ngu-grid]:gap-x-4 [&>.ngu-grid]:gap-y-5',
  title: 'text-base/7 font-semibold text-zinc-900 dark:text-white',
  description: 'text-sm text-zinc-600 dark:text-zinc-400',
  list: 'flex min-w-0 flex-col gap-3 [&>button]:self-start',
  row: 'flex flex-col gap-4 rounded-xl border border-zinc-200 p-4 not-last:mb-3 dark:border-white/10',
  tabs: 'mb-6 flex gap-6 overflow-x-auto border-b border-zinc-200 dark:border-white/10',
  tab: '-mb-px inline-flex shrink-0 cursor-pointer items-center gap-2 border-b-2 border-transparent px-1 py-3 text-sm font-medium text-zinc-500 hover:border-zinc-300 hover:text-zinc-800 focus-visible:outline-2 focus-visible:outline-ngu-accent aria-selected:border-ngu-accent aria-selected:text-ngu-accent dark:text-zinc-400 dark:hover:text-zinc-200 dark:aria-selected:text-white',
  panel:
    'block rounded-xl border border-zinc-200 dark:border-white/10 [&>h3>button]:flex [&>h3>button]:w-full [&>h3>button]:cursor-pointer [&>h3>button]:items-center [&>h3>button]:gap-3 [&>h3>button]:px-4 [&>h3>button]:py-3 [&>h3>button]:text-start [&>h3>button]:focus-visible:outline-2 [&>h3>button]:focus-visible:outline-ngu-accent [&>[role=region]]:px-4 [&>[role=region]]:pb-4',
  steps: 'mb-8 flex flex-wrap gap-x-6 gap-y-3',
  step: 'flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-500 disabled:cursor-not-allowed disabled:opacity-60 aria-[current=step]:text-zinc-900 data-done:text-zinc-900 dark:text-zinc-400 dark:aria-[current=step]:text-white dark:data-done:text-zinc-100',
  button:
    'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-xs hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ngu-accent disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10',
  submit:
    'inline-flex cursor-pointer items-center justify-center rounded-lg bg-ngu-accent px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-ngu-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ngu-accent aria-disabled:cursor-not-allowed aria-disabled:opacity-60',
  actions: 'flex flex-wrap items-center justify-end gap-3 [&>.ngu-back]:me-auto',
  errorSummary:
    'rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 focus:outline-hidden dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200 [&_a]:text-inherit [&_a]:underline [&_h2]:text-sm [&_h2]:font-semibold [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:ps-5',
  notice:
    'flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:bg-white/5 dark:text-zinc-300',
  value: 'text-sm text-zinc-900 dark:text-zinc-100',
};
