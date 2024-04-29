import { TFile } from '@src/shared/types/file.type';
import { TRole } from './role.type';
import { TSubscription } from './subscription.type';

export type TUser = {
  _id: string;
  username: string;
  password: string;
  email: string;
  avatar: TFile | string;
  isVerified: boolean;
  verificationToken: string;
  role: TRole | string;
  subscription: TSubscription | string;
  subscriptionEnd: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type TUserCreateDTO = Partial<Omit<TUser, '_id'>>;
export type TUserUpdateDTO = TUserCreateDTO & Required<{ _id: string }>;

export function isTUser(arg: any): arg is TUser {
  return (
    arg !== 'undefined' &&
    arg._id !== 'undefined' &&
    arg.username !== 'undefined' &&
    arg.password !== 'undefined' &&
    arg.email !== 'undefined' &&
    arg.avatar !== 'undefined' &&
    arg.isVerified !== 'undefined' &&
    arg.verificationToken !== 'undefined' &&
    arg.role !== 'undefined' &&
    arg.subscription !== 'undefined' &&
    arg.subscriptionEnd !== 'undefined' &&
    arg.createdAt !== 'undefined' &&
    arg.updatedAt !== 'undefined'
  );
}
export function isTUserArray(arg: any): arg is TUser[] {
  return Array.isArray(arg) && arg.every((v) => isTUser(v));
}
export function asTUser(arg: any): TUser {
  if (isTUser(arg)) {
    return arg;
  } else {
    throw new Error('Invalid TUser');
  }
}
export function isTUserCreateDTO(arg: any): arg is TUserCreateDTO {
  return (
    arg &&
    arg.username &&
    arg.password &&
    arg.email &&
    arg.avatar &&
    arg.isVerified &&
    arg.verificationToken &&
    arg.role &&
    arg.subscription
  );
}
export function isTUserUpdateDTO(arg: any): arg is TUserUpdateDTO {
  return (
    arg &&
    arg._id &&
    arg.username &&
    arg.password &&
    arg.email &&
    arg.avatar &&
    arg.isVerified &&
    arg.verificationToken &&
    arg.role &&
    arg.subscription
  );
}
