import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PublicProjectPage } from './public-project-page';
import { PublicProjectApi } from '../../core/public-project-api';

describe('PublicProjectPage', () => {
  it('renders public text as text and labels metrics as published content', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: ActivatedRoute, useValue: {
        snapshot: { paramMap: convertToParamMap({ slug: 'portal' }) },
        data: of({ publicProject: { data: { project: { slug: 'portal', name: 'Portal' }, releases: [{ id: 'public', revision: 2, title: '<img src=x onerror=alert(1)>', summary: '<script>private()</script>', changes: ['<b>Texto</b>'], acceptedAt: '2026-11-19', publishedAt: '2026-11-19' }], nextCursor: null }, error: '' } }),
      } },
      { provide: PublicProjectApi, useValue: { load: async () => ({ project: { slug: 'portal', name: 'Portal' }, releases: [{ id: 'public', revision: 2, title: '<img src=x onerror=alert(1)>', summary: '<script>private()</script>', changes: ['<b>Texto</b>'], acceptedAt: '2026-11-19', publishedAt: '2026-11-19' }], nextCursor: null }) } },
    ] });
    const fixture = TestBed.createComponent(PublicProjectPage);
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('script')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(fixture.nativeElement.textContent).toContain('publicadas');
    expect(fixture.nativeElement.textContent).not.toContain('pendientes');
  });
});
