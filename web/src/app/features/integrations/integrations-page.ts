import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IntegrationKey, IntegrationsApi, ProjectCapabilities, Publication, PublicField } from '../../core/integrations-api';
import { Release, ReleaseDetail } from '../../core/product-api';
import { ReleasesApi } from '../../core/releases-api';
import { Session } from '../../core/session';

@Component({
  selector: 'app-integrations-page', imports: [DatePipe, RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './integrations-page.html', styleUrl: './integrations-page.css',
})
export class IntegrationsPage {
  readonly session = inject(Session);
  private readonly api = inject(IntegrationsApi);
  private readonly releasesApi = inject(ReleasesApi);
  readonly org = signal(''); readonly project = signal('');
  readonly capabilities = signal<ProjectCapabilities | null>(null);
  readonly keys = signal<IntegrationKey[]>([]); readonly publications = signal<Publication[]>([]);
  readonly releases = signal<Release[]>([]); readonly releaseCursor = signal<string | undefined>(undefined);
  readonly publicationCursor = signal<string | null | undefined>(undefined);
  readonly selected = signal<ReleaseDetail | null>(null); readonly selectedId = signal('');
  readonly keyName = signal(''); readonly expiresInDays = signal(30); readonly secret = signal('');
  readonly slug = signal(''); readonly publicName = signal(''); readonly reservedSlug = signal('');
  readonly includeSummary = signal(false); readonly includeChanges = signal(false);
  readonly loading = signal(false); readonly busy = signal(false); readonly error = signal(''); readonly notice = signal('');
  readonly role = computed(() => this.session.identity()?.memberships.find(m => m.orgId === this.org())?.projects.find(p => p.projectId === this.project())?.role ?? '');
  readonly isAdmin = computed(() => this.role() === 'administrator' && this.capabilities()?.role === 'administrator');
  readonly canCreateKey = computed(() => this.isAdmin() && this.capabilities()?.integrations === true);
  readonly canPublish = computed(() => this.isAdmin() && this.capabilities()?.publicPublishing === true);
  readonly accepted = computed(() => this.releases().filter(release => release.status === 'accepted'));
  readonly preview = computed(() => this.selected()?.revisions.find(revision => revision.number === this.selected()?.release.revision)?.manifest);
  private generation = 0;
  private alive = true;

  constructor() {
    inject(DestroyRef).onDestroy(() => { this.alive = false; ++this.generation; this.secret.set(''); });
    afterNextRender(async () => {
      await this.session.initialize();
      const memberships = this.session.identity()?.memberships ?? [];
      const membership = memberships.find(m => m.projects.some(p => p.role === 'administrator')) ?? memberships[0];
      const project = membership?.projects.find(p => p.role === 'administrator') ?? membership?.projects[0];
      if (membership && project) await this.selectProject(membership.orgId + '/' + project.projectId);
    });
  }
  async selectProject(value: string) {
    const current = ++this.generation;
    this.loading.set(false); this.busy.set(false);
    this.secret.set(''); this.selected.set(null); this.selectedId.set(''); this.keys.set([]); this.publications.set([]); this.releases.set([]);
    this.capabilities.set(null); this.error.set(''); this.notice.set(''); this.reservedSlug.set(''); this.slug.set('');
    this.releaseCursor.set(undefined); this.publicationCursor.set(undefined); this.includeSummary.set(false); this.includeChanges.set(false);
    const [org, project] = value.split('/');
    const access = this.session.identity()?.memberships.find(m => m.orgId === org)?.projects.find(p => p.projectId === project);
    this.org.set(access ? org : ''); this.project.set(access ? project : ''); this.publicName.set(access?.name ?? '');
    if (!access) return;
    this.loading.set(true);
    try {
      const capabilities = await this.api.capabilities(org, project);
      if (!this.current(current)) return;
      this.capabilities.set(capabilities);
      if (!this.isAdmin()) return;
      const [keys, publications, releases] = await Promise.all([this.api.keys(org, project), this.api.publications(org, project), this.releasesApi.list(org, project)]);
      if (!this.current(current)) return;
      this.keys.set(keys.keys); this.publications.set(publications.publications); this.publicationCursor.set(publications.nextCursor);
      this.releases.set(releases.releases); this.releaseCursor.set(releases.nextCursor);
      if (publications.project) { this.reservedSlug.set(publications.project.slug); this.slug.set(publications.project.slug); this.publicName.set(publications.project.name); }
    } catch (error) { if (this.current(current)) this.error.set(message(error)); }
    finally { if (this.current(current)) this.loading.set(false); }
  }
  async createKey(event: Event) {
    event.preventDefault();
    if (!this.canCreateKey() || this.busy()) return;
    const name = this.keyName().trim(); const days = Number(this.expiresInDays());
    if (!name || name.length > 80 || !Number.isInteger(days) || days < 1 || days > 90) { this.error.set('Escribe un nombre y una caducidad de 1 a 90 días.'); return; }
    this.secret.set('');
    await this.mutate(async current => {
      const result = await this.api.createKey(this.org(), this.project(), { name, expiresInDays: days });
      if (!this.current(current)) return;
      this.keys.update(keys => [result.key, ...keys.filter(key => key.id !== result.key.id)]);
      this.secret.set(result.token); this.keyName.set(''); this.notice.set('Clave creada. Su secreto se muestra una sola vez.');
    });
  }
  forgetSecret() { this.secret.set(''); }
  async copySecret() {
    if (!this.secret()) return;
    try { await navigator.clipboard.writeText(this.secret()); this.notice.set('Clave copiada. Guárdala en el gestor de secretos de tu proyecto.'); }
    catch { this.notice.set('Selecciona la clave y cópiala manualmente.'); }
  }
  async revokeKey(id: string) {
    if (!this.isAdmin()) return;
    await this.mutate(async current => {
      const result = await this.api.revokeKey(this.org(), this.project(), id);
      if (!this.current(current)) return;
      this.secret.set(''); this.keys.update(keys => keys.map(key => key.id === id ? result.key : key)); this.notice.set('Clave revocada. Ya no permite enviar entregas.');
    });
  }
  async selectRelease(id: string) {
    this.selectedId.set(id); this.selected.set(null); this.error.set('');
    this.includeSummary.set(false); this.includeChanges.set(false);
    if (!this.accepted().some(release => release.id === id)) return;
    const current = this.generation; this.loading.set(true);
    try {
      const detail = await this.releasesApi.detail(this.org(), this.project(), id);
      if (this.current(current) && this.selectedId() === id && detail.release.status === 'accepted') this.selected.set(detail);
    } catch (error) { if (this.current(current)) this.error.set(message(error)); }
    finally { if (this.current(current)) this.loading.set(false); }
  }
  async publish(event: Event) {
    event.preventDefault();
    const selected = this.selected();
    if (!this.canPublish() || !selected || selected.release.status !== 'accepted' || !selected.decisions.some(d => d.revision === selected.release.revision && d.outcome === 'accepted')) return;
    const slug = this.slug().trim(); const projectName = this.publicName().trim();
    if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug) || !projectName || projectName.length > 120) { this.error.set('Usa un enlace de 3 a 64 letras minúsculas, números o guiones y un nombre público de hasta 120 caracteres.'); return; }
    const fields: PublicField[] = ['title'];
    if (this.includeSummary()) fields.push('summary'); if (this.includeChanges()) fields.push('changes');
    await this.mutate(async current => {
      const result = await this.api.publish(this.org(), this.project(), selected.release.id, { revision: selected.release.revision, slug, projectName, fields });
      if (!this.current(current)) return;
      this.reservedSlug.set(slug); this.publications.update(items => [result.publication, ...items.filter(item => item.releaseId !== selected.release.id)]);
      this.notice.set('Revisión publicada. El dashboard ya puede consultarse sin iniciar sesión.');
    });
  }
  async unpublish(id: string) {
    if (!this.isAdmin()) return;
    await this.mutate(async current => {
      await this.api.unpublish(this.org(), this.project(), id);
      if (this.current(current)) { this.publications.update(items => items.filter(item => item.releaseId !== id)); this.notice.set('Publicación retirada de las consultas del dashboard.'); }
    });
  }
  async moreReleases() {
    const cursor = this.releaseCursor(); if (!cursor || this.busy()) return;
    await this.mutate(async current => {
      const result = await this.releasesApi.list(this.org(), this.project(), cursor);
      if (this.current(current)) { this.releases.update(items => [...items, ...result.releases.filter(item => !items.some(old => old.id === item.id))]); this.releaseCursor.set(result.nextCursor); }
    });
  }
  async morePublications() {
    const cursor = this.publicationCursor(); if (!cursor || this.busy()) return;
    await this.mutate(async current => {
      const result = await this.api.publications(this.org(), this.project(), cursor);
      if (this.current(current)) { this.publications.update(items => [...items, ...result.publications.filter(item => !items.some(old => old.releaseId === item.releaseId))]); this.publicationCursor.set(result.nextCursor); }
    });
  }
  async logout() { this.secret.set(''); ++this.generation; await this.session.logout(); }
  private current(generation: number) { return this.alive && generation === this.generation; }
  private async mutate(action: (current: number) => Promise<void>) {
    if (this.busy()) return;
    const current = this.generation; this.busy.set(true); this.error.set(''); this.notice.set('');
    try { await action(current); }
    catch (error) { if (this.current(current)) this.error.set(message(error)); }
    finally { if (this.current(current)) this.busy.set(false); }
  }
}
function message(error: unknown) { return error instanceof Error ? error.message : 'No pudimos completar la operación. Vuelve a intentar.'; }
