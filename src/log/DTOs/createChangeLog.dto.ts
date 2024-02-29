import { IsOptional, IsArray, IsNotEmpty } from '@nestjs/class-validator';
import { TChangeLogCreateDTO } from '../types/changeLog.type';
import { TCombo } from '@src/shared/types/combo.type';
import { TLogSectionType } from '../types/logSectionType.type';
import { TLog } from '../types/log.type';
import { IsString } from '@nestjs/class-validator';

export class CreateChangeLogDTO implements TChangeLogCreateDTO {
  @IsOptional()
  @IsArray()
  public logs: (TLog | string)[];
  @IsOptional()
  @IsArray()
  public logSectionTypes: (TLogSectionType | string)[];
  @IsOptional()
  @IsString()
  public logCssClassesDefault: string;
  @IsOptional()
  @IsString()
  public logCssStylesDefault: string;
  @IsOptional()
  @IsArray()
  public logCombosDefault: (TCombo | string)[];
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  public apiKeys: string[];
  constructor(changeLog: TChangeLogCreateDTO | undefined) {
    this.logs = changeLog?.logs;
    this.logSectionTypes = changeLog?.logSectionTypes;
    this.logCssClassesDefault = changeLog?.logCssClassesDefault;
    this.logCssStylesDefault = changeLog?.logCssStylesDefault;
    this.logCombosDefault = changeLog?.logCombosDefault;
  }
}
