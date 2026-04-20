import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-unauthorized',
  templateUrl: './unauthorized.component.html',
  styleUrls: ['./unauthorized.component.scss']
})
export class UnauthorizedComponent {
  readonly portalUrl = environment.auth.portalLoginUrl;

  goToPortal(): void {
    window.location.href = this.portalUrl;
  }
}
