import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { NavbarComponent }           from './shared/navbar/navbar.component';
import { UnauthorizedComponent }     from './features/auth/unauthorized.component';
import { UserViewComponent }         from './features/user/user-view.component';
import { ModelListComponent }        from './features/user/model-list/model-list.component';
import { CalendarComponent }         from './features/user/calendar/calendar.component';
import { ReservationModalComponent } from './features/user/reservation-modal/reservation-modal.component';
import { AdminComponent }            from './features/admin/admin.component';
import { RescheduleModalComponent }  from './features/admin/reschedule-modal/reschedule-modal.component';

import { AuthService } from './core/services/auth.service';
import { ModelService } from './core/services/model.service';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    UnauthorizedComponent,
    UserViewComponent,
    ModelListComponent,
    CalendarComponent,
    ReservationModalComponent,
    AdminComponent,
    RescheduleModalComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: (auth: AuthService) => () => auth.loadCurrentUser(),
      deps: [AuthService],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (models: ModelService) => () => models.loadModels(),
      deps: [ModelService],
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
