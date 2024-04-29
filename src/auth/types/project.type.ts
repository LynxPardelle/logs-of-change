import { TChangeLog } from '@src/log/types/changeLog.type';
import { TSubscription } from './subscription.type';
import { TUser } from './user.type';

export type TProject = {
  _id: string;
  name: string;
  members: (TUser | string)[];
  description: string;
  subscription: TSubscription | string;
  subscriptionEnd: Date;
  changeLog: TChangeLog | string;
  apiKeys: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type TProjectCreateDTO = Partial<Omit<TProject, '_id'>>;
export type TProjectUpdateDTO = TProjectCreateDTO & Required<{ _id: string }>;

export function isTProject(arg: any): arg is TProject {
  return (
    arg !== 'undefined' &&
    arg._id !== 'undefined' &&
    arg.name !== 'undefined' &&
    arg.members !== 'undefined' &&
    arg.description !== 'undefined' &&
    arg.subscription !== 'undefined' &&
    arg.subscriptionEnd !== 'undefined' &&
    arg.changeLog !== 'undefined' &&
    arg.apiKeys !== 'undefined' &&
    arg.createdAt !== 'undefined' &&
    arg.updatedAt !== 'undefined'
  );
}
export function isTProjectArray(arg: any): arg is TProject[] {
  return Array.isArray(arg) && arg.every((v) => isTProject(v));
}
export function asTProject(arg: any): TProject {
  if (isTProject(arg)) {
    return arg;
  } else {
    throw new Error('Invalid TProject');
  }
}
export function isTProjectCreateDTO(arg: any): arg is TProjectCreateDTO {
  return arg && arg.name && arg.members && arg.description && arg.subscription;
}
export function isTProjectUpdateDTO(arg: any): arg is TProjectUpdateDTO {
  return (
    arg &&
    arg._id &&
    arg.name &&
    arg.members &&
    arg.description &&
    arg.subscription
  );
}
