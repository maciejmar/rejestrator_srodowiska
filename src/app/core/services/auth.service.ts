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

  loadCurrentUser(): Promise<void> {
    return this.tryHttpEndpoint()
      .catch(() => this.tryAzureIdToken())
      .catch(() => this.tryStorage())
      .catch(() => this.tryCookie())
      .catch(() => { this.userSubject.next(null); });
  }

  // ── Strategia 1: HTTP endpoint ──────────────────────────────────────────
  private tryHttpEndpoint(): Promise<void> {
    if (!cfg.userEndpoint) return Promise.reject('no endpoint');

    return this.http
      .get<PortalAuthResponse>(cfg.userEndpoint, { withCredentials: true })
      .pipe(timeout(3000), catchError(() => of(null)))
      .toPromise()
      .then((raw: PortalAuthResponse | null | undefined): Promise<void> => {
        if (!raw) return Promise.reject('empty response');
        const user = this.mapResponse(raw);
        if (!user) return Promise.reject('unmappable response');
        this.userSubject.next(user);
        return Promise.resolve();
      });
  }

  // ── Strategia 2: Azure AD id_token z sessionStorage (OIDC portal) ───────
  private tryAzureIdToken(): Promise<void> {
    const idToken = sessionStorage.getItem('id_token');
    if (!idToken) return Promise.reject('no id_token in sessionStorage');

    try {
      const payload = this.decodeJwt(idToken);
      // Azure AD id_token zawiera: email/preferred_username, name, roles
      const user = this.mapResponse(payload as PortalAuthResponse);
      if (!user) return Promise.reject('unmappable id_token');
      this.userSubject.next(user);
      return Promise.resolve();
    } catch {
      return Promise.reject('invalid id_token');
    }
  }

  // ── Strategia 3: localStorage / sessionStorage (klucz portalu) ──────────
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

  // ── Strategia 4: Cookie ──────────────────────────────────────────────────
  private tryCookie(): Promise<void> {
    const name = cfg.cookieName;
    if (!name) return Promise.reject('no cookie name');

    const value = this.readCookie(name);
    if (!value) return Promise.reject('cookie not found');

    try {
      const payload = value.includes('.')
        ? this.decodeJwt(value)
        : JSON.parse(atob(value));
      const user = this.mapResponse(payload as PortalAuthResponse);
      if (!user) return Promise.reject('unmappable cookie');
      this.userSubject.next(user);
      return Promise.resolve();
    } catch {
      return Promise.reject('invalid cookie format');
    }
  }

  // ── Mapper: dowolny format → AppUser ────────────────────────────────────
  private mapResponse(raw: PortalAuthResponse): AppUser | null {
    // Azure AD id_token: preferred_username = email UPN
    const email = raw.email
      ?? raw.mail
      ?? raw.userPrincipalName
      ?? (raw as Record<string, unknown>)['preferred_username'] as string
      ?? '';
    if (!email) return null;

    const displayName =
      raw.displayName ?? raw.name ?? raw.fullName ?? raw.cn ?? email.split('@')[0];

    const allGroups: string[] = [
      ...(raw.groups      ?? []),
      ...(raw.roles       ?? []),
      ...(raw.memberOf    ?? []),
      ...(raw.authorities ?? [])
    ].map((g: string) => g.toLowerCase());

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

  private decodeJwt(token: string): Record<string, unknown> {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  }

  private readCookie(name: string): string | null {
    const match = document.cookie
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith(name + '='));
    return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
  }

  logout(): void {
    this.userSubject.next(null);
    window.location.href = cfg.portalLoginUrl;
  }

  get currentUser(): AppUser | null { return this.userSubject.value; }
  get isLoggedIn(): boolean          { return this.userSubject.value !== null; }
  get isAdmin(): boolean             { return this.userSubject.value?.role === 'admin'; }
}
