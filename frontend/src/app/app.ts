import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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
      title: 'Onboarding',
      items: [
        { path: '/connect', label: 'Connect SAP', icon: '🔌' },
        { path: '/connectors', label: 'Connectors', icon: '◧' },
        { path: '/sync', label: 'Data Sync', icon: '⟳' },
      ],
    },
    {
      title: 'Analysis',
      items: [
        { path: '/dashboard', label: 'Dashboard', icon: '▣' },
        { path: '/findings', label: 'Risk Findings', icon: '⚠' },
        { path: '/graph', label: 'Access Graph', icon: '◈' },
        { path: '/chat', label: 'AI Chat', icon: '✦' },
        { path: '/report', label: 'Audit Report', icon: '⎙' },
      ],
    },
    {
      title: 'Explore',
      items: [
        { path: '/users', label: 'Users', icon: '◍' },
        { path: '/roles', label: 'Roles', icon: '⬡' },
        { path: '/upload', label: 'Data', icon: '⤓' },
      ],
    },
  ];

  protected readonly connector = signal<string>('…');

  constructor() {
    this.api.health().subscribe({
      next: (h) => this.connector.set(h.sapConnector),
      error: () => this.connector.set('offline'),
    });
  }
}
