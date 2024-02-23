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
