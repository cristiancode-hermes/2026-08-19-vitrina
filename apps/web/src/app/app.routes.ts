import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/home.page').then((m) => m.HomePageComponent),
      },
      {
        path: 'exposiciones',
        loadComponent: () =>
          import('./pages/exhibitions-list.page').then(
            (m) => m.ExhibitionsListPageComponent,
          ),
      },
      {
        path: 'exposiciones/:id',
        loadComponent: () =>
          import('./pages/exhibition-detail.page').then(
            (m) => m.ExhibitionDetailPageComponent,
          ),
      },
      {
        path: 'obras/:id',
        loadComponent: () =>
          import('./pages/artwork-detail.page').then(
            (m) => m.ArtworkDetailPageComponent,
          ),
      },
      {
        path: 'checkout/:slotId',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/checkout.page').then((m) => m.CheckoutPageComponent),
      },
      {
        path: 'mis-visitas',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/my-visits.page').then((m) => m.MyVisitsPageComponent),
      },
      {
        path: 'mis-visitas/:id',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/visit-detail.page').then(
            (m) => m.VisitDetailPageComponent,
          ),
      },
      {
        path: 'favoritos',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./pages/favorites.page').then((m) => m.FavoritesPageComponent),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/admin-stats.page').then(
            (m) => m.AdminStatsPageComponent,
          ),
      },
      {
        path: 'admin/exposiciones',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/admin-exhibitions.page').then(
            (m) => m.AdminExhibitionsPageComponent,
          ),
      },
    ],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login.page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./pages/register.page').then((m) => m.RegisterPageComponent),
  },
  { path: '**', redirectTo: '' },
];
