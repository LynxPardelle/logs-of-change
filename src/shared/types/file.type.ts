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

export function isTFile(arg: any): arg is TFile {
  return (
    arg !== 'undefined' &&
    arg._id !== 'undefined' &&
    arg.name !== 'undefined' &&
    arg.type !== 'undefined' &&
    arg.location !== 'undefined' &&
    arg.size !== 'undefined' &&
    arg.createdAt !== 'undefined' &&
    arg.updatedAt !== 'undefined'
  );
}
export function isTFileArray(arg: any): arg is TFile[] {
  return Array.isArray(arg) && arg.every((v) => isTFile(v));
}
export function asTFile(arg: any): TFile {
  if (isTFile(arg)) {
    return arg;
  }
  throw new Error('Invalid TFile');
}
export function isTFileCreateDTO(arg: any): arg is TFileCreateDTO {
  return arg && arg.name && arg.type && arg.location;
}
export function isTFileUpdateDTO(arg: any): arg is TFileUpdateDTO {
  return arg && arg._id && arg.name && arg.type && arg.location;
}
