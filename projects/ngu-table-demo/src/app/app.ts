import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DocsShell } from 'docs-kit/shell/shell';
import { provideDocsSite } from 'docs-kit/site';
import { SITE } from './site';

@Component({
  selector: 'app-root',
  imports: [DocsShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideDocsSite(SITE)],
  template: `<docs-shell />`,
})
export class App {}
