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
