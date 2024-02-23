import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsNumber,
} from '@nestjs/class-validator';
import { TLogSectionTypeCreateDTO } from '../types/logSectionType.type';
import { TCombo } from '@src/shared/types/combo.type';

export class CreateLogSectionTypeDTO implements TLogSectionTypeCreateDTO {
  @IsString()
  @IsNotEmpty()
  public name: string;
  @IsNumber()
  public priorityDefault: number;
  @IsNumber()
  public mediaPositionDefault: number;
  @IsNumber()
  public textPositionDefault: number;
  @IsString()
  @IsOptional()
  public logSectionCssClassesDefault: string;
  @IsString()
  @IsOptional()
  public logSectionCssStylesDefault: string;
  @IsArray()
  @IsOptional()
  public logSectionCombosDefault: (TCombo | string)[];
  @IsString()
  @IsOptional()
  public logTextCssClassesDefault: string;
  @IsString()
  @IsOptional()
  public logTextCssStylesDefault: string;
  @IsArray()
  @IsOptional()
  public logTextCombosDefault: (TCombo | string)[];
  @IsString()
  @IsOptional()
  public logMediaCssClassesDefault: string;
  @IsString()
  @IsOptional()
  public logMediaCssStylesDefault: string;
  @IsArray()
  @IsOptional()
  public logMediaCombosDefault: (TCombo | string)[];
  constructor(logSectionType: TLogSectionTypeCreateDTO) {
    this.name = logSectionType.name;
    this.priorityDefault = logSectionType.priorityDefault;
    this.mediaPositionDefault = logSectionType.mediaPositionDefault;
    this.textPositionDefault = logSectionType.textPositionDefault;
    this.logSectionCssClassesDefault =
      logSectionType.logSectionCssClassesDefault;
    this.logSectionCssStylesDefault = logSectionType.logSectionCssStylesDefault;
    this.logSectionCombosDefault = logSectionType.logSectionCombosDefault;
    this.logTextCssClassesDefault = logSectionType.logTextCssClassesDefault;
    this.logTextCssStylesDefault = logSectionType.logTextCssStylesDefault;
    this.logTextCombosDefault = logSectionType.logTextCombosDefault;
    this.logMediaCssClassesDefault = logSectionType.logMediaCssClassesDefault;
    this.logMediaCssStylesDefault = logSectionType.logMediaCssStylesDefault;
    this.logMediaCombosDefault = logSectionType.logMediaCombosDefault;
  }
}
