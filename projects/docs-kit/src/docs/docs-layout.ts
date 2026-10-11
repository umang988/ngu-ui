import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavMenu } from './nav-menu';

/** Documentation pages and examples: the menu on the left, the page beside it. */
@Component({
  selector: 'app-docs-layout',
  imports: [RouterOutlet, NavMenu],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'docs' },
  template: `
    <nav class="sidebar" aria-label="Documentation">
      <app-nav-menu />
    </nav>
    <div class="docs__main">
      <router-outlet />
    </div>
  `,
})
export class DocsLayout {}
