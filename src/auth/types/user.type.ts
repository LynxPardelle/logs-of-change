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
