import { mayReview, type ReleaseDetail } from './product-api';

describe('review action permissions', () => {
  const detail = {
    release: { createdBy: 'original-author', revision: 2 },
    revisions: [{ number: 2, manifest: { createdBy: 'revision-author', submittedBy: 'presenter' } }], decisions: [],
  } as unknown as ReleaseDetail;
  it('offers a review to another authorized reviewer', () => expect(mayReview('reviewer', 'client', detail)).toBe(true));
  it('hides review for the original author, revision author and presenter', () => {
    for (const sub of ['original-author', 'revision-author', 'presenter']) expect(mayReview('administrator', sub, detail)).toBe(false);
  });
  it('hides review from an editor and from a closed session', () => {
    expect(mayReview('editor', 'client', detail)).toBe(false);
    expect(mayReview('reviewer', undefined, detail)).toBe(false);
  });
});
