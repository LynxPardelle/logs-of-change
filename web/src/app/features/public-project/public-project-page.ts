import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, PendingTasks, RESPONSE_INIT, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicProject, PublicProjectApi, PublicProjectError } from '../../core/public-project-api';
import { PublicProjectResolution } from '../../core/public-project-resolver';

@Component({
  selector: 'app-public-project-page', imports: [DatePipe, RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './public-project-page.html', styleUrl: './public-project-page.css',
})
export class PublicProjectPage {
  private readonly api = inject(PublicProjectApi);
  private readonly route = inject(ActivatedRoute);
  private readonly pending = inject(PendingTasks);
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  readonly data = signal<PublicProject | null>(null);
  readonly loading = signal(false); readonly error = signal(''); readonly slug = signal('');
  readonly releases = computed(() => [...(this.data()?.releases ?? [])].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)));
  readonly latest = computed(() => this.releases()[0]?.publishedAt);
  private generation = 0;
  constructor() {
    this.route.data.pipe(takeUntilDestroyed()).subscribe(routeData => {
      const initial = routeData['publicProject'] as PublicProjectResolution;
      ++this.generation; this.slug.set(this.route.snapshot.paramMap.get('slug') ?? '');
      this.data.set(initial.data); this.error.set(initial.error); this.loading.set(false);
    });
  }
  async load(append = false) {
    if (append && (!this.data()?.nextCursor || this.loading())) return;
    const current = ++this.generation; const slug = this.slug(); const cursor = append ? this.data()?.nextCursor ?? undefined : undefined;
    const done = this.pending.add();
    this.loading.set(true); this.error.set('');
    if (!append) this.data.set(null);
    try {
      const result = await this.api.load(slug, cursor);
      if (current !== this.generation) return;
      const previous = append ? this.data()?.releases ?? [] : [];
      this.data.set({ ...result, releases: [...previous, ...result.releases.filter(item => !previous.some(old => old.id === item.id))] });
    } catch (error) {
      if (current === this.generation) {
        this.error.set(error instanceof PublicProjectError ? error.message : 'No pudimos cargar este proyecto público.');
        if (this.response && !append) this.response.status = error instanceof PublicProjectError && error.status === 404 ? 404 : 503;
      }
    } finally { if (current === this.generation) this.loading.set(false); done(); }
  }
}
