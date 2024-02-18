import { TChangeLog } from '../types/changeLog.type';

export class ChangeLogDTO implements TChangeLog {
  public _id: string;
  public project: string;
  public logs: string[];
  public apiKeys: string[];
  public logSectionTypes: string[];
  public logCssClassesDefault: string[];
  public logCssStylesDefault: string[];
  public logCombosDefault: string[];
  constructor(changeLog) {
    this._id = changeLog._id;
    this.project = changeLog.project;
    this.logs = changeLog.logs;
    this.apiKeys = changeLog.apiKeys;
    this.logSectionTypes = changeLog.logSectionTypes;
    this.logCssClassesDefault = changeLog.logCssClassesDefault;
    this.logCssStylesDefault = changeLog.logCssStylesDefault;
    this.logCombosDefault = changeLog.logCombosDefault;
  }
}
