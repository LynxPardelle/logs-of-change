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

export function isTRole(arg: any): arg is TRole {
  return (
    arg !== 'undefined' &&
    arg._id !== 'undefined' &&
    arg.name !== 'undefined' &&
    arg.subscription !== 'undefined' &&
    arg.canEditUsers !== 'undefined' &&
    arg.canEditSubscriptions !== 'undefined' &&
    arg.canEditProjects !== 'undefined' &&
    arg.canEditChangeLogs !== 'undefined' &&
    arg.canManageFiles !== 'undefined' &&
    arg.canEditRoles !== 'undefined' &&
    arg.canEditConfigs !== 'undefined' &&
    arg.isTechnician !== 'undefined' &&
    arg.isAdmin !== 'undefined' &&
    arg.createdAt !== 'undefined' &&
    arg.updatedAt !== 'undefined'
  );
}
export function isTRoleArray(arg: any): arg is TRole[] {
  return Array.isArray(arg) && arg.every((v) => isTRole(v));
}
export function asTRole(arg: any): TRole {
  if (isTRole(arg)) {
    return arg;
  } else {
    throw new Error('Invalid TRole');
  }
}
export function isTRoleCreateDTO(arg: any): arg is TRoleCreateDTO {
  return (
    arg &&
    arg.name &&
    arg.subscription &&
    arg.canEditUsers &&
    arg.canEditSubscriptions &&
    arg.canEditProjects &&
    arg.canEditChangeLogs &&
    arg.canManageFiles &&
    arg.canEditRoles &&
    arg.canEditConfigs &&
    arg.isTechnician &&
    arg.isAdmin
  );
}
export function isTRoleUpdateDTO(arg: any): arg is TRoleUpdateDTO {
  return (
    arg &&
    arg._id &&
    arg.name &&
    arg.subscription &&
    arg.canEditUsers &&
    arg.canEditSubscriptions &&
    arg.canEditProjects &&
    arg.canEditChangeLogs &&
    arg.canManageFiles &&
    arg.canEditRoles &&
    arg.canEditConfigs &&
    arg.isTechnician &&
    arg.isAdmin
  );
}
