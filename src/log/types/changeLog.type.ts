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
  createdAt: Date;
  updatedAt: Date;
};

export type TChangeLogCreateDTO = Partial<Omit<TChangeLog, '_id'>>;
export type TChangeLogUpdateDTO = TChangeLogCreateDTO &
  Required<{ _id: string }>;
