import { ViewportScroller } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { NavMenu } from '../docs/nav-menu';
import { Search } from '../docs/search';
import { injectDocsSite, type SiteLink } from '../site';
import { ThemeService } from '../ui/theme';

/** The site frame: header with search and theme switch, phone menu, page, footer. */
@Component({
  selector: 'docs-shell',
  imports: [RouterOutlet, RouterLink, NavMenu, Search],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class DocsShell {
  protected readonly site = injectDocsSite();
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly drawer = viewChild<ElementRef<HTMLDialogElement>>('drawer');

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: '/' },
  );

  /** The header link for the current page: by `match`, else the one without; none at home. */
  protected readonly current = computed<SiteLink | undefined>(() => {
    const path = this.url().split(/[?#]/)[0];
    if (path === '/' || path === '') {
      return undefined;
    }
    const links = this.site.links;
    return links.find((l) => l.match && path.startsWith(l.match)) ?? links.find((l) => !l.match);
  });

  constructor() {
    // Anchor links land below the sticky header.
    inject(ViewportScroller).setOffset([0, 80]);
    // A link chosen in the phone menu closes it.
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.closeMenu());
  }

  protected openMenu(): void {
    const drawer = this.drawer()?.nativeElement;
    drawer?.showModal();
    drawer?.querySelector('a.is-active')?.scrollIntoView({ block: 'center' });
  }

  protected closeMenu(): void {
    const drawer = this.drawer()?.nativeElement;
    if (drawer?.open) {
      drawer.close();
    }
  }

  /** A click on the backdrop closes the menu. */
  protected onDrawerClick(event: MouseEvent): void {
    if (event.target === this.drawer()?.nativeElement) {
      this.closeMenu();
    }
  }
}
