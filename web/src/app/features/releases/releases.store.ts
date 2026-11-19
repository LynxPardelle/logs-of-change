import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { ReleasesApi } from '../../core/releases-api';
import type { Release, ReleaseDetail, ReleaseInput } from '../../core/product-api';

type WorkspaceState = {
  orgId: string; projectId: string; releases: Release[]; detail: ReleaseDetail | null;
  nextCursor: string | undefined; loading: boolean; busy: boolean; error: string; notice: string;
};

export const ReleasesStore = signalStore(
  withState<WorkspaceState>({ orgId: '', projectId: '', releases: [], detail: null, nextCursor: undefined, loading: false, busy: false, error: '', notice: '' }),
  withMethods((store, api = inject(ReleasesApi)) => {
    let generation = 0;
    const load = async (append = false) => {
      const current = ++generation;
      const org = store.orgId(); const project = store.projectId();
      if (!org || !project) return;
      patchState(store, { loading: true, error: '' });
      try {
        const result = await api.list(org, project, append ? store.nextCursor() : undefined);
        if (current !== generation) return;
        patchState(store, { releases: append ? [...store.releases(), ...result.releases] : result.releases, nextCursor: result.nextCursor });
      } catch (error) {
        if (current === generation) patchState(store, { error: message(error) });
      } finally { if (current === generation) patchState(store, { loading: false }); }
    };
    const selectRelease = async (id: string) => {
      const current = ++generation;
      const org = store.orgId(); const project = store.projectId();
      patchState(store, { loading: true, detail: null, error: '', notice: '' });
      try {
        const detail = await api.detail(org, project, id);
        if (current === generation) patchState(store, { detail });
      } catch (error) { if (current === generation) patchState(store, { error: message(error) }); }
      finally { if (current === generation) patchState(store, { loading: false }); }
    };
    const mutate = async (operation: () => Promise<{ release: Release }>, notice: string) => {
      if (store.busy()) return;
      const org = store.orgId(); const project = store.projectId();
      patchState(store, { busy: true, error: '', notice: '' });
      try {
        const result = await operation();
        if (org !== store.orgId() || project !== store.projectId()) return;
        await load();
        await selectRelease(result.release.id);
        patchState(store, { notice });
      } catch (error) { if (org === store.orgId() && project === store.projectId()) patchState(store, { error: message(error) }); }
      finally { patchState(store, { busy: false }); }
    };
    return {
      load,
      async selectProject(orgId: string, projectId: string) {
        ++generation;
        patchState(store, { orgId, projectId, releases: [], detail: null, nextCursor: undefined, error: '', notice: '' });
        await load();
      },
      selectRelease,
      clearSelected() { ++generation; patchState(store, { detail: null, loading: false, error: '', notice: '' }); },
      reset() { ++generation; patchState(store, { orgId: '', projectId: '', releases: [], detail: null, nextCursor: undefined, error: '', notice: '', loading: false, busy: false }); },
      create(body: ReleaseInput) { return mutate(() => api.create(store.orgId(), store.projectId(), body), 'Borrador guardado. Revisa su contenido antes de presentarlo.'); },
      revise(body: ReleaseInput) {
        const release = store.detail()?.release;
        return release ? mutate(() => api.revise(store.orgId(), store.projectId(), release.id, { ...body, expectedRevision: release.revision }), 'Nueva revisión preparada. La evidencia anterior se conserva.') : Promise.resolve();
      },
      submit() {
        const release = store.detail()?.release;
        return release ? mutate(() => api.submit(store.orgId(), store.projectId(), release.id, release.revision), 'Entrega presentada. Esta revisión queda registrada para el revisor.') : Promise.resolve();
      },
      decide(outcome: 'accepted' | 'changes_requested', reason: string) {
        const release = store.detail()?.release;
        return release ? mutate(() => api.decide(store.orgId(), store.projectId(), release.id, release.revision, outcome, reason), outcome === 'accepted' ? 'Decisión registrada: entrega aceptada.' : 'Decisión registrada: cambios solicitados.') : Promise.resolve();
      },
      async downloadActa(revision: number) {
        const release = store.detail()?.release;
        if (!release) return;
        patchState(store, { error: '' });
        try {
          const acta = await api.acta(store.orgId(), store.projectId(), release.id, revision);
          const url = URL.createObjectURL(new Blob([JSON.stringify(acta, null, 2)], { type: 'application/json' }));
          const link = document.createElement('a'); link.href = url; link.download = `logs-of-change-${release.id}-r${revision}.json`; link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) { patchState(store, { error: message(error) }); }
      },
    };
  }),
);

function message(error: unknown): string { return error instanceof Error ? error.message : 'No pudimos completar la operación. Vuelve a intentar.'; }
