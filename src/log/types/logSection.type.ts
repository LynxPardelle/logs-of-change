import { TCombo } from '@src/shared/types/combo.type';
import { TLogMedia } from './logMedia.type';
import { TLogSectionType } from './logSectionType.type';
import { TLogText } from './logText.type';

export type TLogSection = {
  _id: string;
  type: TLogSectionType | string;
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
  Omit<TLogSection, '_id' | 'type' | 'priority'>
> &
  Required<Pick<TLogSection, 'type' | 'priority'>>;
export type TLogSectionUpdateDTO = TLogSectionCreateDTO &
  Required<{ _id: string }>;
