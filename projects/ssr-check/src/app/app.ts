import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { PAGES } from './app.routes';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Examples">
      @for (page of pages; track page) {
        <a [routerLink]="'/' + page">{{ page }}</a>
      }
    </nav>
    <main>
      <h1>SSR check</h1>
      <router-outlet />
    </main>
  `,
  styles: `
    nav {
      display: flex;
      gap: 1rem;
    }
  `,
})
export class App {
  protected readonly pages = PAGES;
}
