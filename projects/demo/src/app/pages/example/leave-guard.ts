import type { CanDeactivateFn } from '@angular/router';
import { nguUnsavedChangesGuard } from 'ngu-form';
import type { ExamplePage } from './example-page';

/**
 * The guard looks for forms on the component it is given. Here the form lives in the
 * example rendered inside the page, so the page hands that component over.
 */
export const leaveExampleGuard: CanDeactivateFn<ExamplePage> = (page) =>
  nguUnsavedChangesGuard(page.exampleInstance());
