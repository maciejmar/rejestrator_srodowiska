import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <app-navbar></app-navbar>
    <main class="main-content">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100vh; }
    .main-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
  `]
})
export class AppComponent {}
