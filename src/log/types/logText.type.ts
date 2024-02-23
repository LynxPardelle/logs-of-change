import { TCombo } from '@src/shared/types/combo.type';

export type TLogText = {
  _id: string;
  text: string;
  position: number;
  cssClasses: string;
  cssStyles: string;
  combos: (TCombo | string)[];
  createdAt: Date;
  updatedAt: Date;
};

export type TLogTextCreateDTO = Partial<
  Omit<TLogText, '_id' | 'text' | 'position'>
> &
  Required<Pick<TLogText, 'text' | 'position'>>;
export type TLogTextUpdateDTO = TLogTextCreateDTO & Required<{ _id: string }>;
