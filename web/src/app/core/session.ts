import { Injectable, signal } from '@angular/core';
import type { UserManager, User } from 'oidc-client-ts';
import type { Identity, RuntimeConfig } from './product-api';

@Injectable({ providedIn: 'root' })
export class Session {
  readonly config = signal<RuntimeConfig | null>(null);
  readonly identity = signal<Identity | null>(null);
  readonly ready = signal(false);
  readonly authenticated = signal(false);
  readonly error = signal('');
  private manager?: UserManager;
  private token: string | null = null;
  private expiresAt = 0;
  private started = false;

  accessToken(): string | null { return this.token && this.expiresAt > Date.now() ? this.token : null; }
  async initialize(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.error.set('');
    try {
      const response = await fetch('/api/v1/config', { cache: 'no-store' });
      if (!response.ok) throw new Error('No pudimos cargar la configuración del espacio.');
      const config: RuntimeConfig = await response.json();
      if (!config.auth?.issuer || !config.auth?.clientId || !config.auth?.domain || !config.auth?.redirectUri) throw new Error('El acceso a este espacio todavía no está configurado.');
      const domain = new URL(config.auth.domain);
      const callback = new URL(config.auth.redirectUri);
      if (domain.protocol !== 'https:' || callback.origin !== location.origin) throw new Error('La configuración de acceso no corresponde a este espacio.');
      this.config.set(config);
      const { UserManager, WebStorageStateStore } = await import('oidc-client-ts');
      const store = new WebStorageStateStore({ store: sessionStorage, prefix: 'logs-of-change.user.' });
      this.manager = new UserManager({
        authority: config.auth.issuer, client_id: config.auth.clientId,
        redirect_uri: config.auth.redirectUri, post_logout_redirect_uri: `${location.origin}/`,
        response_type: 'code', scope: 'openid email profile', loadUserInfo: false,
        automaticSilentRenew: false, monitorSession: false,
        stateStore: new WebStorageStateStore({ store: sessionStorage, prefix: 'logs-of-change.state.' }),
        userStore: {
          get: (key) => store.get(key), remove: (key) => store.remove(key), getAllKeys: () => store.getAllKeys(),
          set: (key, value) => { const user = JSON.parse(value); delete user.refresh_token; return store.set(key, JSON.stringify(user)); },
        },
        metadata: {
          issuer: config.auth.issuer,
          authorization_endpoint: `${domain.origin}/oauth2/authorize`, token_endpoint: `${domain.origin}/oauth2/token`,
          jwks_uri: `${config.auth.issuer}/.well-known/jwks.json`,
        },
      });
      this.manager.events.addAccessTokenExpired(() => this.clear());
      let user: User | null;
      if (location.pathname === '/auth/callback') {
        try { user = await this.manager.signinRedirectCallback(location.href); }
        finally { history.replaceState({}, '', '/'); }
      } else user = await this.manager.getUser();
      if (user && !user.expired) {
        this.token = user.access_token; this.expiresAt = (user.expires_at ?? 0) * 1000;
        const identityResponse = await fetch('/api/v1/identity/me', { headers: { Authorization: `Bearer ${this.token}` }, cache: 'no-store' });
        if (!identityResponse.ok) throw new Error('No pudimos comprobar tu acceso. Vuelve a iniciar sesión.');
        this.identity.set(await identityResponse.json()); this.authenticated.set(true);
      }
    } catch (error) {
      this.clear(); this.error.set(error instanceof Error ? error.message : 'No pudimos abrir tu espacio.');
      this.started = false;
    } finally { this.ready.set(true); }
  }
  async login(): Promise<void> {
    this.error.set('');
    try {
      if (!this.manager) await this.initialize();
      if (this.manager) await this.manager.signinRedirect();
    } catch { this.error.set('No pudimos abrir el inicio de sesión. Vuelve a intentar.'); }
  }
  async logout(): Promise<void> {
    this.clear();
    await this.manager?.removeUser();
    const config = this.config();
    if (config) {
      const url = new URL('/logout', config.auth.domain);
      url.searchParams.set('client_id', config.auth.clientId); url.searchParams.set('logout_uri', `${location.origin}/`);
      location.assign(url.href);
    }
  }
  private clear() { this.token = null; this.expiresAt = 0; this.authenticated.set(false); this.identity.set(null); }
}
