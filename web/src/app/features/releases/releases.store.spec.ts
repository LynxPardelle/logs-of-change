import { TestBed } from '@angular/core/testing';
import { ReleasesApi } from '../../core/releases-api';
import { ReleasesStore } from './releases.store';
import type { Release } from '../../core/product-api';

describe('ReleasesStore', () => {
  it('discards an older response when the user changes projects', async () => {
    let finishFirst!: (value: { releases: Release[] }) => void;
    const first = new Promise<{ releases: Release[] }>(resolve => finishFirst = resolve);
    const api = { list: (_org: string, project: string) => project === 'first' ? first : Promise.resolve({ releases: [] }) };
    TestBed.configureTestingModule({ providers: [ReleasesStore, { provide: ReleasesApi, useValue: api }] });
    const store = TestBed.inject(ReleasesStore);
    const oldRequest = store.selectProject('agency', 'first');
    await store.selectProject('agency', 'second');
    finishFirst({ releases: [{ id: 'private-old-project' } as Release] });
    await oldRequest;
    expect(store.projectId()).toBe('second');
    expect(store.releases()).toEqual([]);
  });

  it('clears private project data when the session closes', async () => {
    const api = { list: () => Promise.resolve({ releases: [{ id: 'r1' } as Release], nextCursor: 'cursor' }) };
    TestBed.configureTestingModule({ providers: [ReleasesStore, { provide: ReleasesApi, useValue: api }] });
    const store = TestBed.inject(ReleasesStore);
    await store.selectProject('agency', 'portal');
    expect(store.releases()).toHaveLength(1);
    store.reset();
    expect(store.releases()).toEqual([]);
    expect(store.orgId()).toBe('');
    expect(store.nextCursor()).toBeUndefined();
  });
});
