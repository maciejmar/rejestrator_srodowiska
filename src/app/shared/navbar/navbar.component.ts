import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { AppUser } from '../../core/models/user.model';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  currentUser: AppUser | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    public router: Router,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.auth.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((u: AppUser | null) => this.currentUser = u);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isActive(path: string): boolean {
    return this.router.url.startsWith('/' + path);
  }

  navigate(path: string): void {
    this.router.navigate(['/' + path]);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
