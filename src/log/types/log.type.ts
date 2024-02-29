import { TCombo } from '@src/shared/types/combo.type';
import { TLogSection } from './logSection.type';

export type TLog = {
  _id: string;
  date: Date;
  logSections: (TLogSection | string)[];
  cssClasses: string;
  cssStyles: string;
  combos: (TCombo | string)[];
  createdAt: Date;
  updatedAt: Date;
};
export type TLogCreateDTO = Partial<Omit<TLog, '_id'>>;
export type TLogUpdateDTO = TLogCreateDTO & Required<{ _id: string }>;

export function isTLog(arg: any): arg is TLog {
  return (
    arg !== 'undefined' &&
    arg._id !== 'undefined' &&
    arg.date !== 'undefined' &&
    arg.logSections !== 'undefined' &&
    arg.cssClasses !== 'undefined' &&
    arg.cssStyles !== 'undefined' &&
    arg.combos !== 'undefined' &&
    arg.createdAt !== 'undefined' &&
    arg.updatedAt !== 'undefined'
  );
}
export function isTLogArray(arg: any): arg is TLog[] {
  return Array.isArray(arg) && arg.every((v) => isTLog(v));
}
export function asTLog(arg: any): TLog {
  if (isTLog(arg)) {
    return arg;
  }
  throw new Error('Invalid TLog');
}
export function isTLogCreateDTO(arg: any): arg is TLogCreateDTO {
  return true;
}
export function isTLogUpdateDTO(arg: any): arg is TLogUpdateDTO {
  return arg && arg._id;
}
