import { TCombo } from '@src/shared/types/combo.type';
import { TLogMedia } from './logMedia.type';
import { TLogSectionType } from './logSectionType.type';
import { TLogText } from './logText.type';

export type TLogSection = {
  _id: string;
  type?: TLogSectionType | string;
  priority: number;
  media: (TLogMedia | string)[];
  texts: (TLogText | string)[];
  titles: (TLogText | string)[];
  cssClasses: string;
  cssStyles: string;
  combos: (TCombo | string)[];
  createdAt: Date;
  updatedAt: Date;
};

export type TLogSectionCreateDTO = Partial<
  Omit<TLogSection, '_id' | 'priority'>
> &
  Required<Pick<TLogSection, 'priority'>>;
export type TLogSectionUpdateDTO = TLogSectionCreateDTO &
  Required<{ _id: string }>;

export function isTLogSection(arg: any): arg is TLogSection {
  return (
    arg !== 'undefined' &&
    arg._id !== 'undefined' &&
    arg.priority !== 'undefined' &&
    arg.media !== 'undefined' &&
    arg.texts !== 'undefined' &&
    arg.titles !== 'undefined' &&
    arg.cssClasses !== 'undefined' &&
    arg.cssStyles !== 'undefined' &&
    arg.combos !== 'undefined' &&
    arg.createdAt !== 'undefined' &&
    arg.updatedAt !== 'undefined'
  );
}
export function isTLogSectionArray(arg: any): arg is TLogSection[] {
  return Array.isArray(arg) && arg.every((v) => isTLogSection(v));
}
export function asTLogSection(arg: any): TLogSection {
  if (isTLogSection(arg)) {
    return arg;
  }
  throw new Error('Invalid TLogSection');
}
export function isTLogSectionCreateDTO(arg: any): arg is TLogSectionCreateDTO {
  return arg && arg.priority;
}
export function isTLogSectionUpdateDTO(arg: any): arg is TLogSectionUpdateDTO {
  return arg && arg._id;
}
