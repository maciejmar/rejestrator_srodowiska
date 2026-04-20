import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UnauthorizedComponent } from './features/auth/unauthorized.component';
import { UserViewComponent }     from './features/user/user-view.component';
import { AdminComponent }        from './features/admin/admin.component';
import { authGuard }  from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

const routes: Routes = [
  { path: '',             redirectTo: 'user', pathMatch: 'full' },
  { path: 'unauthorized', component: UnauthorizedComponent },
  { path: 'user',         component: UserViewComponent, canActivate: [authGuard] },
  { path: 'admin',        component: AdminComponent,    canActivate: [authGuard, adminGuard] },
  { path: '**',           redirectTo: 'user' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
