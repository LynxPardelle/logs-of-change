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

export function isTLogMedia(arg: any): arg is TLogMedia {
  return (
    arg !== 'undefined' &&
    arg._id !== 'undefined' &&
    arg.file !== 'undefined' &&
    arg.position !== 'undefined' &&
    arg.cssClasses !== 'undefined' &&
    arg.cssStyles !== 'undefined' &&
    arg.combos !== 'undefined' &&
    arg.createdAt !== 'undefined' &&
    arg.updatedAt !== 'undefined'
  );
}
export function isTLogMediaArray(arg: any): arg is TLogMedia[] {
  return Array.isArray(arg) && arg.every((v) => isTLogMedia(v));
}
export function asTLogMedia(arg: any): TLogMedia {
  if (isTLogMedia(arg)) {
    return arg;
  }
  throw new Error('Invalid TLogMedia');
}
export function isTLogMediaCreateDTO(arg: any): arg is TLogMediaCreateDTO {
  return arg && arg.file && arg.position;
}
export function isTLogMediaUpdateDTO(arg: any): arg is TLogMediaUpdateDTO {
  return arg && arg._id && arg.file && arg.position;
}
