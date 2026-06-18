import { Component, inject, signal } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { ApiService } from './core/api.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly api = inject(ApiService);

  protected readonly groups: NavGroup[] = [
    {
      title: 'Einrichtung',
      items: [
        { path: '/connect', label: 'SAP verbinden', icon: '🔌' },
        { path: '/connectors', label: 'Konnektoren', icon: '◧' },
        { path: '/sync', label: 'Datensynchronisation', icon: '⟳' },
      ],
    },
    {
      title: 'Analyse',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: '▣' },
        { path: '/findings', label: 'Risikobefunde', icon: '⚠' },
        { path: '/graph', label: 'Zugriffsgraph', icon: '◈' },
        { path: '/chat', label: 'KI-Chat', icon: '✦' },
        { path: '/report', label: 'Prüfbericht', icon: '⎙' },
      ],
    },
    {
      title: 'Erkunden',
      items: [
        { path: '/users', label: 'Benutzer', icon: '◍' },
        { path: '/roles', label: 'Rollen', icon: '⬡' },
        { path: '/upload', label: 'Daten', icon: '⤓' },
      ],
    },
    {
      title: 'BSH-Mock',
      items: [
        { path: '/brk', label: 'Berechtigungskonzept', icon: '▦' },
      ],
    },
  ];

  private readonly router = inject(Router);
  protected readonly connector = signal<string>('…');
  /** Full-bleed (no max-width / padding) for immersive screens like /brk. */
  protected readonly fullBleed = signal(false);
  /** Mobile off-canvas nav open state. */
  protected readonly menuOpen = signal(false);

  constructor() {
    this.api.health().subscribe({
      next: (h) => this.connector.set(h.sapConnector),
      error: () => this.connector.set('offline'),
    });

    const evaluate = (url: string) => this.fullBleed.set(url.startsWith('/brk'));
    evaluate(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        evaluate(e.urlAfterRedirects);
        this.menuOpen.set(false); // close the mobile drawer on navigation
      });
  }
}
