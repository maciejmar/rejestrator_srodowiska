export const environment = {
  production: false,
  apiUrl: '/rezerwacje/api',
  appName: 'Portal AI – Rezerwacja Modeli',

  auth: {
    /*
     * STRATEGIA 1 – HTTP endpoint (zalecana)
     * Portal (lub nginx auth_request / Authelia) udostępnia endpoint
     * zwracający JSON z danymi aktualnie zalogowanego usera.
     *
     * Obsługiwane pola odpowiedzi (każde z nich opcjonalne):
     *   email / mail         → adres email usera
     *   displayName / name / cn → imię i nazwisko
     *   groups / roles / memberOf → lista grup/ról
     *
     * Przykładowe odpowiedzi które aplikacja rozumie:
     *   { "email": "j.kowalski@bgk.pl", "displayName": "Jan Kowalski", "groups": ["ai-admins"] }
     *   { "mail": "j.kowalski@bgk.pl", "cn": "Jan Kowalski", "memberOf": ["CN=ai-admins,DC=bgk,DC=pl"] }
     *   { "email": "j.kowalski@bgk.pl", "name": "Jan Kowalski", "roles": ["ROLE_AI_ADMIN"] }
     *
     * Ustaw na null aby pominąć tę strategię.
     */
    userEndpoint: '/portal-ai/auth/me',

    /*
     * STRATEGIA 2 – Klucz localStorage / sessionStorage
     * Inny serwis (portal) zapisuje dane usera pod tym kluczem.
     * Oczekiwany format: JSON string { email, displayName, groups? }
     *
     * Ustaw na null aby pominąć.
     */
    sharedStorageKey: 'portal-ai-user',

    /*
     * STRATEGIA 3 – Cookie
     * Nazwa cookie zawierającego JWT lub JSON z danymi usera.
     * Ustaw na null aby pominąć.
     */
    cookieName: null as string | null,

    /*
     * Grupy/role które przyznają uprawnienia ADMINISTRATORA.
     * Porównanie case-insensitive, obsługuje też częściowe dopasowanie
     * (np. "CN=ai-admins,DC=bgk,DC=pl" będzie pasować na "ai-admins").
     */
    adminGroups: ['ai-admins', 'ai-portal-admins', 'portal-ai-admin', 'ai-administrators'],

    /*
     * Adresy email z rolą admina (uzupełnienie do grup, legacy fallback).
     */
    adminEmails: ['admin@bgk.pl', 'it.admin@bgk.pl', 'superadmin@bgk.pl'],

    /*
     * URL portalu do przekierowania gdy user NIE jest zalogowany.
     * Aplikacja przekieruje tutaj zamiast pokazywać własny formularz logowania.
     */
    portalLoginUrl: 'http://portal-ai.bank.com.pl/login'
  }
};
