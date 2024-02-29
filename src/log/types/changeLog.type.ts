import { TCombo } from '@src/shared/types/combo.type';
import { TLogSectionType } from './logSectionType.type';
import { TLog } from './log.type';

export type TChangeLog = {
  _id: string;
  logs: (TLog | string)[];
  logSectionTypes: (TLogSectionType | string)[];
  logCssClassesDefault: string;
  logCssStylesDefault: string;
  logCombosDefault: (TCombo | string)[];
  apiKeys: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type TChangeLogCreateDTO = Partial<Omit<TChangeLog, '_id'>> &
  Required<Pick<TChangeLog, 'apiKeys'>>;
export type TChangeLogUpdateDTO = TChangeLogCreateDTO &
  Required<{ _id: string }>;

export function isTChangeLog(arg: any): arg is TChangeLog {
  return (
    arg !== 'undefined' &&
    arg._id !== 'undefined' &&
    arg.logs !== 'undefined' &&
    arg.logSectionTypes !== 'undefined' &&
    arg.logCssClassesDefault !== 'undefined' &&
    arg.logCssStylesDefault !== 'undefined' &&
    arg.logCombosDefault !== 'undefined' &&
    arg.apiKeys !== 'undefined' &&
    arg.createdAt !== 'undefined' &&
    arg.updatedAt !== 'undefined'
  );
}
export function isTChangeLogArray(arg: any): arg is TChangeLog[] {
  return Array.isArray(arg) && arg.every((v) => isTChangeLog(v));
}
export function asTChangeLog(arg: any): TChangeLog {
  if (isTChangeLog(arg)) {
    return arg;
  } else {
    throw new Error('Invalid TChangeLog');
  }
}
export function isTChangeLogCreateDTO(arg: any): arg is TChangeLogCreateDTO {
  return arg && arg.apiKeys;
}
export function isTChangeLogUpdateDTO(arg: any): arg is TChangeLogUpdateDTO {
  return arg && arg._id && arg.apiKeys;
}
