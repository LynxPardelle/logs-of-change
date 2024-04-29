export type TSubscription = {
  _id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  logsLimit: number;
  filesLimit: number;
  fileSizeLimit: number;
  allFilesSizeLimit: number;
  canCreateSectionTypes: boolean;
  canCreateCombos: boolean;
  canUploadFiles: boolean;
  fileTypes: string[];
  canEditCssClasses: boolean;
  canEditCssStyles: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type TSubscriptionCreateDTO = Partial<Omit<TSubscription, '_id'>>;
export type TSubscriptionUpdateDTO = TSubscriptionCreateDTO &
  Required<{ _id: string }>;

export function isTSubscription(arg: any): arg is TSubscription {
  return (
    arg !== 'undefined' &&
    arg._id !== 'undefined' &&
    arg.name !== 'undefined' &&
    arg.description !== 'undefined' &&
    arg.price !== 'undefined' &&
    arg.duration !== 'undefined' &&
    arg.logsLimit !== 'undefined' &&
    arg.filesLimit !== 'undefined' &&
    arg.fileSizeLimit !== 'undefined' &&
    arg.allFilesSizeLimit !== 'undefined' &&
    arg.canCreateSectionTypes !== 'undefined' &&
    arg.canCreateCombos !== 'undefined' &&
    arg.canUploadFiles !== 'undefined' &&
    arg.fileTypes !== 'undefined' &&
    arg.canEditCssClasses !== 'undefined' &&
    arg.canEditCssStyles !== 'undefined' &&
    arg.createdAt !== 'undefined' &&
    arg.updatedAt !== 'undefined'
  );
}
export function isTSubscriptionArray(arg: any): arg is TSubscription[] {
  return Array.isArray(arg) && arg.every((v) => isTSubscription(v));
}
export function asTSubscription(arg: any): TSubscription {
  if (isTSubscription(arg)) {
    return arg;
  } else {
    throw new Error('Invalid TSubscription');
  }
}
export function isTSubscriptionCreateDTO(
  arg: any,
): arg is TSubscriptionCreateDTO {
  return (
    arg &&
    arg.name &&
    arg.price &&
    arg.duration &&
    arg.logsLimit &&
    arg.filesLimit &&
    arg.fileSizeLimit &&
    arg.allFilesSizeLimit &&
    arg.canCreateSectionTypes &&
    arg.canCreateCombos &&
    arg.canUploadFiles &&
    arg.fileTypes &&
    arg.canEditCssClasses &&
    arg.canEditCssStyles
  );
}
export function isTSubscriptionUpdateDTO(
  arg: any,
): arg is TSubscriptionUpdateDTO {
  return (
    arg &&
    arg._id &&
    arg.name &&
    arg.price &&
    arg.duration &&
    arg.logsLimit &&
    arg.filesLimit &&
    arg.fileSizeLimit &&
    arg.allFilesSizeLimit &&
    arg.canCreateSectionTypes &&
    arg.canCreateCombos &&
    arg.canUploadFiles &&
    arg.fileTypes &&
    arg.canEditCssClasses &&
    arg.canEditCssStyles
  );
}
