import { ChangeDetectionStrategy, Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Session } from '../../core/session';
import { mayReview, statusLabel } from '../../core/product-api';
import { ApiHealthStore } from '../health/api-health.store';
import { ReleasesStore } from './releases.store';

@Component({
  selector: 'app-workspace-page', imports: [DatePipe], providers: [ApiHealthStore, ReleasesStore],
  templateUrl: './workspace-page.html', styleUrl: './workspace-page.css', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspacePage {
  readonly session = inject(Session);
  readonly health = inject(ApiHealthStore);
  readonly store = inject(ReleasesStore);
  readonly labels = statusLabel;
  readonly editing = signal(false);
  readonly revising = signal(false);
  readonly title = signal(''); readonly summary = signal(''); readonly changes = signal(''); readonly reason = signal('');
  readonly formError = signal('');
  readonly role = computed(() => this.session.identity()?.memberships.find(m => m.orgId === this.store.orgId())?.projects.find(p => p.projectId === this.store.projectId())?.role ?? '');
  readonly canEdit = computed(() => ['administrator', 'admin', 'editor'].includes(this.role()));
  readonly canReview = computed(() => mayReview(this.role(), this.session.identity()?.sub, this.store.detail()));
  readonly currentProject = computed(() => this.session.identity()?.memberships.find(m => m.orgId === this.store.orgId())?.projects.find(p => p.projectId === this.store.projectId())?.name ?? 'Tus proyectos');

  constructor() {
    afterNextRender(async () => {
      await this.session.initialize();
      const membership = this.session.identity()?.memberships[0];
      const project = membership?.projects[0];
      if (membership && project) await this.store.selectProject(membership.orgId, project.projectId);
    });
  }
  selectProject(value: string) {
    const [org, project] = value.split('/'); this.editing.set(false); this.revising.set(false);
    void this.store.selectProject(org, project);
  }
  selectRelease(id: string) { this.editing.set(false); this.revising.set(false); this.reason.set(''); void this.store.selectRelease(id); }
  newDraft() { this.store.clearSelected(); this.title.set(''); this.summary.set(''); this.changes.set(''); this.formError.set(''); this.editing.set(true); this.revising.set(false); }
  newRevision() {
    const release = this.store.detail()?.release; if (!release) return;
    this.title.set(release.title); this.summary.set(release.summary); this.changes.set(release.changes.join('\n'));
    this.formError.set(''); this.revising.set(true); this.editing.set(true);
  }
  async save(event: Event) {
    event.preventDefault();
    const body = { title: this.title().trim(), summary: this.summary().trim(), changes: this.changes().split('\n').map(line => line.trim()).filter(Boolean) };
    this.formError.set('');
    if (!body.title || !body.summary || !body.changes.length) { this.formError.set('Completa el nombre, el alcance y al menos un cambio.'); return; }
    if (body.changes.length > 30 || body.changes.some(change => change.length > 700)) { this.formError.set('Incluye hasta 30 cambios, con un máximo de 700 caracteres por cambio.'); return; }
    if (this.revising()) await this.store.revise(body); else await this.store.create(body);
    if (!this.store.error()) { this.editing.set(false); this.revising.set(false); }
  }
  decision(outcome: 'accepted' | 'changes_requested') {
    if (outcome === 'changes_requested' && !this.reason().trim()) return;
    void this.store.decide(outcome, this.reason().trim());
  }
  async logout() { this.store.reset(); await this.session.logout(); }
  revision(number: number) { return this.store.detail()?.revisions.find(revision => revision.number === number); }
}
