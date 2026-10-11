import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { injectDocsSite } from '../site';

/** The documentation menu: groups of page links, the current page marked. */
@Component({
  selector: 'app-nav-menu',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'nav-menu' },
  template: `
    @for (group of groups; track group.title) {
      <div class="nav-menu__group">
        <p class="nav-menu__title" [id]="prefix + slug(group.title)">{{ group.title }}</p>
        <ul [attr.aria-labelledby]="prefix + slug(group.title)">
          @for (item of group.items; track item.path) {
            <li>
              <a
                #link
                [routerLink]="'/' + item.path"
                routerLinkActive="is-active"
                ariaCurrentWhenActive="page"
                (isActiveChange)="onActive($event, link)"
                >{{ item.title }}</a
              >
            </li>
          }
        </ul>
      </div>
    }
  `,
})
export class NavMenu {
  private static count = 0;
  /** The sidebar and the phone drawer can both be in the page; their ids must differ. */
  protected readonly prefix = `nav${NavMenu.count++}-`;
  protected readonly groups = injectDocsSite().nav;
  /** Scrolls the menu, not the page, so the current page's link is in view. */
  protected onActive(active: boolean, link: HTMLElement): void {
    if (!active) {
      return;
    }
    requestAnimationFrame(() => {
      const menu = link.closest<HTMLElement>('.sidebar');
      if (!menu) {
        return;
      }
      const box = menu.getBoundingClientRect();
      const item = link.getBoundingClientRect();
      if (box.height && (item.top < box.top || item.bottom > box.bottom)) {
        menu.scrollTop += item.top - box.top - box.height / 3;
      }
    });
  }

  protected slug(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
}
