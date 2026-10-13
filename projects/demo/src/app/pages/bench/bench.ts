import { afterNextRender, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { defineForm, NguForm, type FormDef } from 'ngu-form';

// A form with many fields, for e2e/perf.spec.ts. `?fields=500` sets the size (default 500), in
// groups of ten: text, email, number, select, checkbox, date, textarea, radio, text, number.
// Not in the sidebar. Marks `bench:start` and `bench:rendered` on the performance timeline.

type Row = Record<string, unknown>;

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
  { value: 'c', label: 'Charlie' },
];

function build(count: number): FormDef<Record<string, Row>> {
  const initial: Record<string, Row> = {};
  const spec: Record<string, unknown> = {};
  for (let g = 0; g < Math.ceil(count / 10); g++) {
    const size = Math.min(10, count - g * 10);
    const kinds = [
      ['text', '', { label: 'Name', required: true, minLength: 2 }],
      ['email', '', { label: 'Email', type: 'email', required: true }],
      ['number', 0, { label: 'Quantity', min: 1, max: 99 }],
      ['select', '', { label: 'Plan', type: 'select', options: OPTIONS, required: true }],
      ['checkbox', false, 'Subscribed'],
      ['date', null, { label: 'Start date', type: 'date' }],
      ['textarea', '', { label: 'Notes', type: 'textarea', maxLength: 200 }],
      ['radio', 'a', { label: 'Tier', type: 'radio', options: OPTIONS }],
      ['code', '', { label: 'Code', pattern: /^[A-Z]{3}$/, hint: 'Three capital letters' }],
      ['price', 0, { label: 'Price', min: 0 }],
    ] as const;
    const row: Row = {};
    const fields: Record<string, unknown> = {};
    for (const [key, value, def] of kinds.slice(0, size)) {
      row[key] = value;
      fields[key] = def;
    }
    initial[`g${g}`] = row;
    spec[`g${g}`] = { title: `Section ${g + 1}`, cols: 2, fields };
  }
  return defineForm(initial, spec as never);
}

@Component({
  selector: 'app-bench',
  imports: [NguForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bench">
      <h1>{{ count }} fields</h1>
      <ngu-form [form]="form" submitLabel="Check all" errorSummary />
    </div>
  `,
  styles: `
    .bench {
      max-width: 60rem;
      margin: 0 auto;
      padding: 2rem 1rem;
    }
  `,
})
export class Bench {
  protected readonly count = Math.max(10, Number(inject(ActivatedRoute).snapshot.queryParamMap.get('fields') ?? 500) || 500);
  protected readonly form: FormDef<Record<string, Row>>;

  constructor() {
    performance.mark('bench:start');
    this.form = build(this.count);
    afterNextRender(() => performance.mark('bench:rendered'));
  }
}
