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
