import { TestBed } from '@angular/core/testing';
import { NguDropdown } from './dropdown';

/**
 * An "Any" option carries a null value, and null is a value. Keying a row by the row itself
 * whenever its field read as null once sent the option object to the server as
 * `status=[object Object]`.
 */
describe('A dropdown option whose value is null', () => {
  interface Option {
    value: string | null;
    label: string;
  }

  const options: Option[] = [
    { value: null, label: 'Any' },
    { value: 'APPROVED', label: 'Approved' },
  ];

  interface Internals {
    pick: (row: unknown) => void;
  }

  function create<T>(rows: readonly T[]) {
    const fixture = TestBed.createComponent<NguDropdown<T>>(NguDropdown);
    fixture.componentRef.setInput('options', rows);
    fixture.detectChanges();
    return {
      fixture,
      dd: fixture.componentInstance,
      sut: fixture.componentInstance as unknown as Internals,
    };
  }

  it('commits null rather than the option object', () => {
    const { dd, sut } = create(options);
    dd.value.set('APPROVED');

    sut.pick(options[0]);

    expect(dd.value()).toBeNull();
  });

  it('still emits a real value for an ordinary option', () => {
    const { dd, sut } = create(options);
    let emitted: unknown = null;
    dd.value.subscribe((v: unknown) => (emitted = v));

    sut.pick(options[1]);

    expect(emitted).toBe('APPROVED');
  });

  it('keys a primitive list by the row itself, which has no field to read', () => {
    const { dd, sut } = create(['North', 'South']);
    let emitted: unknown = null;
    dd.value.subscribe((v: unknown) => (emitted = v));

    sut.pick('South');

    expect(emitted).toBe('South');
  });

  it('shows the placeholder for a null value, which means nothing is chosen', () => {
    const { fixture, dd } = create(options);
    dd.value.set(null);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Select…');
  });
});
