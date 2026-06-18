import { Component, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { BrkIconComponent } from './pages/brk/brk-icon';

interface MenuItem {
  label: string;
  route?: string;
  header?: boolean;
}
interface Menu {
  label: string;
  items: MenuItem[];
}

/**
 * Top menu bar. "Berechtigungskonzepte" mirrors the Schwäbisch Hall tool; the
 * second "BAPI" menu gathers our own application's navigation (grouped).
 */
const MENUS: Menu[] = [
  {
    label: 'Berechtigungskonzepte',
    items: [
      { label: 'Meine BRKs', route: '/brk/mine' },
      { label: 'Alle BRKs', route: '/brk/all' },
    ],
  },
  {
    label: 'BAPI',
    items: [
      { label: 'Einrichtung', header: true },
      { label: 'SAP verbinden', route: '/connect' },
      { label: 'Konnektoren', route: '/connectors' },
      { label: 'Datensynchronisation', route: '/sync' },
      { label: 'Analyse', header: true },
      { label: 'Dashboard', route: '/dashboard' },
      { label: 'Risikobefunde', route: '/findings' },
      { label: 'Zugriffsgraph', route: '/graph' },
      { label: 'KI-Chat', route: '/chat' },
      { label: 'Prüfbericht', route: '/report' },
      { label: 'Erkunden', header: true },
      { label: 'Benutzer', route: '/users' },
      { label: 'Rollen', route: '/roles' },
      { label: 'Daten', route: '/upload' },
    ],
  },
];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BrkIconComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);

  protected readonly menus = MENUS;
  protected readonly currentUser = 'Max Mustermann';
  protected readonly open = signal<number | null>(null);
  protected readonly activeIndex = signal<number>(-1);
  /** Full-bleed (no max-width / padding) for immersive screens like /brk. */
  protected readonly fullBleed = signal(false);

  constructor() {
    const evaluate = (url: string) => {
      this.fullBleed.set(url.startsWith('/brk'));
      this.activeIndex.set(
        MENUS.findIndex((m) =>
          m.items.some((it) => it.route && url.startsWith(it.route)),
        ),
      );
    };
    evaluate(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        evaluate(e.urlAfterRedirects);
        this.open.set(null);
      });
  }

  toggle(i: number, event: MouseEvent): void {
    event.stopPropagation();
    this.open.set(this.open() === i ? null : i);
  }

  select(item: MenuItem): void {
    if (item.route) this.router.navigateByUrl(item.route);
    this.open.set(null);
  }

  /** Close any open menu when clicking elsewhere. */
  @HostListener('document:click')
  closeMenus(): void {
    this.open.set(null);
  }
}
