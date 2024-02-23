export type TCombo = {
  _id: string;
  name: string;
  cssClasses: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type TComboCreateDTO = Partial<Omit<TCombo, '_id'>>;
export type TComboUpdateDTO = TComboCreateDTO & Required<{ _id: string }>;
