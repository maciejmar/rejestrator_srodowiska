import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { AppUser, PortalAuthResponse } from '../models/user.model';
import { environment } from '../../../environments/environment';

const cfg = environment.auth;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<AppUser | null>(null);
  readonly currentUser$: Observable<AppUser | null> = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Wywoływane przez APP_INITIALIZER — blokuje bootstrap aplikacji
   * do czasu ustalenia tożsamości użytkownika.
   *
   * Kolejność strategii:
   *   1. GET /portal-ai/auth/me  (HTTP endpoint portalu)
   *   2. localStorage / sessionStorage  (klucz ustawiony przez inną aplikację)
   *   3. Cookie  (JWT lub JSON zakodowany w cookie)
   */
  loadCurrentUser(): Promise<void> {
    return this.tryHttpEndpoint()
      .catch(() => this.tryStorage())
      .catch(() => this.tryCookie())
      .catch(() => {
        this.userSubject.next(null);
      });
  }

  // ── Strategia 1: HTTP endpoint ──────────────────────────────────────────
  private tryHttpEndpoint(): Promise<void> {
    if (!cfg.userEndpoint) return Promise.reject('no endpoint');

    return this.http
      .get<PortalAuthResponse>(cfg.userEndpoint, { withCredentials: true })
      .pipe(
        timeout(5000),
        catchError(() => of(null))
      )
      .toPromise()
      .then((raw: PortalAuthResponse | null | undefined): Promise<void> => {
        if (!raw) return Promise.reject('empty response');
        const user = this.mapResponse(raw);
        if (!user) return Promise.reject('unmappable response');
        this.userSubject.next(user);
        return Promise.resolve();
      });
  }

  // ── Strategia 2: localStorage / sessionStorage ───────────────────────────
  private tryStorage(): Promise<void> {
    const key = cfg.sharedStorageKey;
    if (!key) return Promise.reject('no storage key');

    const raw = localStorage.getItem(key) ?? sessionStorage.getItem(key);
    if (!raw) return Promise.reject('nothing in storage');

    try {
      const parsed = JSON.parse(raw) as PortalAuthResponse;
      const user = this.mapResponse(parsed);
      if (!user) return Promise.reject('unmappable storage value');
      this.userSubject.next(user);
      return Promise.resolve();
    } catch {
      return Promise.reject('invalid JSON in storage');
    }
  }

  // ── Strategia 3: Cookie ─────────────────────────────────────────────────
  private tryCookie(): Promise<void> {
    const name = cfg.cookieName;
    if (!name) return Promise.reject('no cookie name');

    const value = this.readCookie(name);
    if (!value) return Promise.reject('cookie not found');

    try {
      // Obsługa JWT: weź payload (środkowa część)
      const payload = value.includes('.')
        ? JSON.parse(atob(value.split('.')[1]))
        : JSON.parse(atob(value));

      const user = this.mapResponse(payload as PortalAuthResponse);
      if (!user) return Promise.reject('unmappable cookie');
      this.userSubject.next(user);
      return Promise.resolve();
    } catch {
      return Promise.reject('invalid cookie format');
    }
  }

  // ── Mapper: dowolny format portalu → AppUser ────────────────────────────
  private mapResponse(raw: PortalAuthResponse): AppUser | null {
    const email = raw.email ?? raw.mail ?? raw.userPrincipalName ?? '';
    if (!email) return null;

    const displayName =
      raw.displayName ?? raw.name ?? raw.fullName ?? raw.cn ?? email.split('@')[0];

    const allGroups: string[] = [
      ...(raw.groups   ?? []),
      ...(raw.roles    ?? []),
      ...(raw.memberOf ?? []),
      ...(raw.authorities ?? [])
    ].map(g => g.toLowerCase());

    const adminGroupMatch = cfg.adminGroups.some(ag =>
      allGroups.some(g => g.includes(ag.toLowerCase()))
    );
    const adminEmailMatch = cfg.adminEmails
      .map(e => e.toLowerCase())
      .includes(email.toLowerCase());

    return {
      email,
      displayName,
      role: adminGroupMatch || adminEmailMatch ? 'admin' : 'user'
    };
  }

  private readCookie(name: string): string | null {
    const match = document.cookie
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith(name + '='));
    return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  logout(): void {
    this.userSubject.next(null);
    // Przekieruj do strony wylogowania portalu
    window.location.href = cfg.portalLoginUrl;
  }

  get currentUser(): AppUser | null { return this.userSubject.value; }
  get isLoggedIn(): boolean          { return this.userSubject.value !== null; }
  get isAdmin(): boolean             { return this.userSubject.value?.role === 'admin'; }
}
