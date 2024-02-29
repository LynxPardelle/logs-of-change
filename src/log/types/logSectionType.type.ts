import { TCombo } from '@src/shared/types/combo.type';

export type TLogSectionType = {
  _id: string;
  name: string;
  priorityDefault: number;
  mediaPositionDefault: number;
  textPositionDefault: number;
  logSectionCssClassesDefault: string;
  logSectionCssStylesDefault: string;
  logSectionCombosDefault: (TCombo | string)[];
  logTextCssClassesDefault: string;
  logTextCssStylesDefault: string;
  logTextCombosDefault: (TCombo | string)[];
  logMediaCssClassesDefault: string;
  logMediaCssStylesDefault: string;
  logMediaCombosDefault: (TCombo | string)[];
  createdAt: Date;
  updatedAt: Date;
};

export type TLogSectionTypeCreateDTO = Partial<
  Omit<
    TLogSectionType,
    | '_id'
    | 'name'
    | 'priorityDefault'
    | 'mediaPositionDefault'
    | 'textPositionDefault'
  >
> &
  Required<
    Pick<
      TLogSectionType,
      | 'name'
      | 'priorityDefault'
      | 'mediaPositionDefault'
      | 'textPositionDefault'
    >
  >;

export type TLogSectionTypeUpdateDTO = TLogSectionTypeCreateDTO &
  Required<{ _id: string }>;

export function isTLogSectionType(arg: any): arg is TLogSectionType {
  return (
    arg !== 'undefined' &&
    arg._id !== 'undefined' &&
    arg.name !== 'undefined' &&
    arg.priorityDefault !== 'undefined' &&
    arg.mediaPositionDefault !== 'undefined' &&
    arg.textPositionDefault !== 'undefined' &&
    arg.logSectionCssClassesDefault !== 'undefined' &&
    arg.logSectionCssStylesDefault !== 'undefined' &&
    arg.logSectionCombosDefault !== 'undefined' &&
    arg.logTextCssClassesDefault !== 'undefined' &&
    arg.logTextCssStylesDefault !== 'undefined' &&
    arg.logTextCombosDefault !== 'undefined' &&
    arg.logMediaCssClassesDefault !== 'undefined' &&
    arg.logMediaCssStylesDefault !== 'undefined' &&
    arg.logMediaCombosDefault !== 'undefined' &&
    arg.createdAt !== 'undefined' &&
    arg.updatedAt !== 'undefined'
  );
}
export function isTLogSectionTypeArray(arg: any): arg is TLogSectionType[] {
  return Array.isArray(arg) && arg.every((v) => isTLogSectionType(v));
}
export function asTLogSectionType(arg: any): TLogSectionType {
  if (isTLogSectionType(arg)) {
    return arg;
  }
  throw new Error('Invalid TLogSectionType');
}
export function isTLogSectionTypeCreateDTO(
  arg: any,
): arg is TLogSectionTypeCreateDTO {
  return arg && arg.name && arg.priorityDefault && arg.mediaPositionDefault;
}
