import { TSubscription } from './subscription.type';

export type TRole = {
  _id: string;
  name: string;
  subscription: TSubscription | string;
  canEditUsers: boolean;
  canEditSubscriptions: boolean;
  canEditProjects: boolean;
  canEditChangeLogs: boolean;
  canManageFiles: boolean;
  canEditRoles: boolean;
  canEditConfigs: boolean;
  isTechnician: boolean;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type TRoleCreateDTO = Partial<Omit<TRole, '_id'>>;
export type TRoleUpdateDTO = TRoleCreateDTO & Required<{ _id: string }>;
