export const environment = {
  production: true,
  apiUrl: '/rezerwacje/api',
  appName: 'Portal AI – Rezerwacja Modeli',

  auth: {
    userEndpoint: '/portal-ai/auth/me',
    sharedStorageKey: 'portal-ai-user',
    cookieName: null as string | null,
    adminGroups: ['ai-admins', 'ai-portal-admins', 'portal-ai-admin', 'ai-administrators'],
    adminEmails: ['admin@bgk.pl', 'it.admin@bgk.pl', 'superadmin@bgk.pl'],
    portalLoginUrl: 'http://portal-ai.bank.com.pl/login'
  }
};
