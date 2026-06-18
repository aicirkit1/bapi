import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'connect' },
  {
    path: 'connect',
    title: 'Connect SAP · BAPI',
    loadComponent: () =>
      import('./pages/connect/connect').then((m) => m.ConnectionCenterComponent),
  },
  {
    path: 'connectors',
    title: 'Connectors · BAPI',
    loadComponent: () =>
      import('./pages/connectors/connectors').then(
        (m) => m.ConnectorSelectionComponent,
      ),
  },
  {
    path: 'sync',
    title: 'Sync · BAPI',
    loadComponent: () =>
      import('./pages/sync/sync').then((m) => m.SyncProgressComponent),
  },
  {
    path: 'dashboard',
    title: 'Dashboard · BAPI',
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
  },
  {
    path: 'chat',
    title: 'AI Chat · BAPI',
    loadComponent: () => import('./pages/chat/chat').then((m) => m.ChatComponent),
  },
  {
    path: 'users',
    title: 'Users · BAPI',
    loadComponent: () =>
      import('./pages/users/users').then((m) => m.UsersComponent),
  },
  {
    path: 'users/:id',
    title: 'User · BAPI',
    loadComponent: () =>
      import('./pages/user-detail/user-detail').then(
        (m) => m.UserDetailComponent,
      ),
  },
  {
    path: 'roles',
    title: 'Roles · BAPI',
    loadComponent: () =>
      import('./pages/roles/roles').then((m) => m.RolesComponent),
  },
  {
    path: 'roles/:id',
    title: 'Role · BAPI',
    loadComponent: () =>
      import('./pages/role-detail/role-detail').then(
        (m) => m.RoleDetailComponent,
      ),
  },
  {
    path: 'graph',
    title: 'Access Graph · BAPI',
    loadComponent: () =>
      import('./pages/graph/graph').then((m) => m.GraphComponent),
  },
  {
    path: 'findings',
    title: 'Risk Findings · BAPI',
    loadComponent: () =>
      import('./pages/findings/findings').then((m) => m.FindingsComponent),
  },
  {
    path: 'findings/:id',
    title: 'Risk Detail · BAPI',
    loadComponent: () =>
      import('./pages/finding-detail/finding-detail').then(
        (m) => m.FindingDetailComponent,
      ),
  },
  {
    path: 'risks',
    title: 'SoD Rules · BAPI',
    loadComponent: () =>
      import('./pages/risks/risks').then((m) => m.RisksComponent),
  },
  {
    path: 'report',
    title: 'Audit Report · BAPI',
    loadComponent: () =>
      import('./pages/report/report').then((m) => m.ReportComponent),
  },
  {
    path: 'upload',
    title: 'Data · BAPI',
    loadComponent: () =>
      import('./pages/upload/upload').then((m) => m.UploadComponent),
  },
  {
    path: 'brk',
    title: 'BRK · BAPI',
    loadComponent: () =>
      import('./pages/brk/brk-shell').then((m) => m.BrkShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'mine' },
      {
        path: 'mine',
        data: { scope: 'mine' },
        loadComponent: () =>
          import('./pages/brk/brk-list').then((m) => m.BrkListComponent),
      },
      {
        path: 'all',
        data: { scope: 'all' },
        loadComponent: () =>
          import('./pages/brk/brk-list').then((m) => m.BrkListComponent),
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./pages/brk/brk-detail').then((m) => m.BrkDetailComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
