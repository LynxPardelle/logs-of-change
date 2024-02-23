import { IsArray, IsDate, IsOptional, IsString } from '@nestjs/class-validator';
import { TLogCreateDTO } from '../types/log.type';
import { TLogSection } from '../types/logSection.type';
import { TCombo } from '@src/shared/types/combo.type';

export class CreateLogDTO implements TLogCreateDTO {
  @IsDate()
  @IsOptional()
  public date: Date;
  @IsArray()
  @IsOptional()
  public logSections: (TLogSection | string)[];
  @IsString()
  @IsOptional()
  public cssClasses: string;
  @IsString()
  @IsOptional()
  public cssStyles: string;
  @IsArray()
  @IsOptional()
  public combos: (TCombo | string)[];
  constructor(log: TLogCreateDTO) {
    this.date = log.date;
    this.logSections = log.logSections;
    this.cssClasses = log.cssClasses;
    this.cssStyles = log.cssStyles;
    this.combos = log.combos;
  }
}
