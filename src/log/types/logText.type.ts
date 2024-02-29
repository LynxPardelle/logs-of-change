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

export function isTLogText(arg: any): arg is TLogText {
  return (
    arg !== 'undefined' &&
    arg._id !== 'undefined' &&
    arg.text !== 'undefined' &&
    arg.position !== 'undefined' &&
    arg.cssClasses !== 'undefined' &&
    arg.cssStyles !== 'undefined' &&
    arg.combos !== 'undefined' &&
    arg.createdAt !== 'undefined' &&
    arg.updatedAt !== 'undefined'
  );
}
export function isTLogTextArray(arg: any): arg is TLogText[] {
  return Array.isArray(arg) && arg.every((v) => isTLogText(v));
}
export function asTLogText(arg: any): TLogText {
  if (isTLogText(arg)) {
    return arg;
  }
  throw new Error('Invalid TLogText');
}
export function isTLogTextCreateDTO(arg: any): arg is TLogTextCreateDTO {
  return arg && arg.text && arg.position;
}
