import { TCombo } from '@src/shared/types/combo.type';
import { TFile } from '@src/shared/types/file.type';

export type TLogMedia = {
  _id: string;
  file: TFile | string;
  position: number;
  cssClasses: string;
  cssStyles: string;
  combos: (TCombo | string)[];
  createdAt: Date;
  updatedAt: Date;
};

export type TLogMediaCreateDTO = Partial<
  Omit<TLogMedia, '_id' | 'file' | 'position'>
> &
  Required<Pick<TLogMedia, 'file' | 'position'>>;
export type TLogMediaUpdateDTO = TLogMediaCreateDTO & Required<{ _id: string }>;
