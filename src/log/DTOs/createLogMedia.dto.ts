import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
} from '@nestjs/class-validator';
import { TLogMediaCreateDTO } from '../types/logMedia.type';
import { TCombo } from '@src/shared/types/combo.type';
import { TFile } from '@src/shared/types/file.type';

export class CreateLogMediaDTO implements TLogMediaCreateDTO {
  @IsString()
  @IsNotEmpty()
  public file: TFile | string;
  @IsString()
  @IsNotEmpty()
  public position: number;
  @IsString()
  @IsOptional()
  public cssClasses: string;
  @IsString()
  @IsOptional()
  public cssStyles: string;
  @IsArray()
  @IsOptional()
  public combos: (TCombo | string)[];
  constructor(logMedia: TLogMediaCreateDTO) {
    this.file = logMedia.file;
    this.position = logMedia.position;
    this.cssClasses = logMedia.cssClasses;
    this.cssStyles = logMedia.cssStyles;
    this.combos = logMedia.combos;
  }
}
