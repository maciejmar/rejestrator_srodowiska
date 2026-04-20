export type UserRole = 'admin' | 'user';

export interface AppUser {
  email: string;
  displayName: string;
  role: UserRole;
}

/** Elastyczny format odpowiedzi z portalu / SSO */
export interface PortalAuthResponse {
  // email
  email?: string;
  mail?: string;
  userPrincipalName?: string;
  // imię i nazwisko
  displayName?: string;
  name?: string;
  cn?: string;
  fullName?: string;
  // grupy / role
  groups?: string[];
  roles?: string[];
  memberOf?: string[];   // Active Directory LDAP
  authorities?: string[];
}
