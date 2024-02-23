export type TFile = {
  _id: string;
  name: string;
  type: string;
  location: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
};

export type TFileCreateDTO = Partial<Omit<TFile, '_id'>>;
export type TFileUpdateDTO = TFileCreateDTO & Required<{ _id: string }>;
