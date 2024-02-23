import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsNumber,
} from '@nestjs/class-validator';
import { TLogSectionCreateDTO } from '../types/logSection.type';
import { TLogSectionType } from '../types/logSectionType.type';
import { TLogMedia } from '../types/logMedia.type';
import { TLogText } from '../types/logText.type';
import { TCombo } from '@src/shared/types/combo.type';

export class CreateLogSectionDTO implements TLogSectionCreateDTO {
  @IsString()
  @IsNotEmpty()
  public type: TLogSectionType | string;
  @IsNumber()
  public priority: number;
  @IsArray()
  @IsOptional()
  public media: (TLogMedia | string)[];
  @IsArray()
  @IsOptional()
  public texts: (TLogText | string)[];
  @IsArray()
  @IsOptional()
  public titles: (TLogText | string)[];
  @IsString()
  @IsOptional()
  public cssClasses: string;
  @IsString()
  @IsOptional()
  public cssStyles: string;
  @IsArray()
  @IsOptional()
  public combos: (TCombo | string)[];
  constructor(logSection: TLogSectionCreateDTO) {
    this.type = logSection.type;
    this.media = logSection.media;
    this.texts = logSection.texts;
    this.titles = logSection.titles;
    this.cssClasses = logSection.cssClasses;
    this.cssStyles = logSection.cssStyles;
    this.combos = logSection.combos;
  }
}
