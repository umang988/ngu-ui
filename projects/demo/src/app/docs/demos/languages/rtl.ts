import { Component } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

@Component({
  selector: 'demo-rtl',
  imports: [NguForm],
  // Logical CSS throughout: dir="rtl" on any ancestor mirrors the form.
  template: `
    <div dir="rtl" lang="ar">
      <ngu-form [form]="form" submitLabel="حفظ" />
    </div>
  `,
})
export class RtlDemo {
  readonly form = defineForm(
    { name: '', phone: '', city: '' },
    {
      name: { label: 'الاسم', required: true },
      phone: { label: 'الهاتف', mask: '000 000 0000', hint: 'يبقى الرقم من اليسار إلى اليمين' },
      city: { label: 'المدينة', prefix: '📍' },
    },
    { cols: { base: 1, md: 2 } },
  );
}
