export interface RuntimeConfig {
  product: string;
  environment: string;
  auth: { issuer: string; clientId: string; domain: string; redirectUri: string };
}

export interface ProjectAccess { projectId: string; name: string; role: string }
export interface Membership { orgId: string; orgName: string; projects: ProjectAccess[] }
export interface Identity { sub: string; memberships: Membership[] }
export type ReleaseStatus = 'draft' | 'pending_review' | 'accepted' | 'changes_requested';
export interface Release {
  id: string; orgId: string; projectId: string; title: string; summary: string;
  changes: string[]; revision: number; status: ReleaseStatus;
  createdBy: string; createdAt: string; updatedAt: string; version: number;
}
export interface Revision { number: number; manifest: { title?: string; summary?: string; changes?: string[]; createdBy?: string; submittedBy?: string; [key: string]: unknown }; digest?: string; submittedAt?: string; [key: string]: unknown }
export interface Decision { revision: number; outcome: string; reason?: string; actor?: string; decidedAt?: string; [key: string]: unknown }
export interface ReleaseDetail { release: Release; revisions: Revision[]; decisions: Decision[] }
export interface ReleaseInput { title: string; summary: string; changes: string[] }

export const statusLabel: Record<ReleaseStatus, string> = {
  draft: 'Borrador', pending_review: 'En revisión', accepted: 'Aceptada', changes_requested: 'Cambios solicitados',
};

export function mayReview(role: string, sub: string | undefined, detail: ReleaseDetail | null): boolean {
  if (!sub || !detail || !['administrator', 'admin', 'reviewer'].includes(role)) return false;
  const manifest = detail.revisions.find(revision => revision.number === detail.release.revision)?.manifest;
  return ![detail.release.createdBy, manifest?.createdBy, manifest?.submittedBy].includes(sub);
}
