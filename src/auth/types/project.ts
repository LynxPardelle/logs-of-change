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
