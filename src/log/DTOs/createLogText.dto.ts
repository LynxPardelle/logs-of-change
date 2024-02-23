import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsNumber,
} from '@nestjs/class-validator';
import { TLogTextCreateDTO } from '../types/logText.type';
import { TCombo } from '@src/shared/types/combo.type';

export class CreateLogTextDTO implements TLogTextCreateDTO {
  @IsString()
  @IsNotEmpty()
  public text: string;
  @IsNumber()
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
  constructor(logText: TLogTextCreateDTO) {
    this.text = logText.text;
    this.position = logText.position;
    this.cssClasses = logText.cssClasses;
    this.cssStyles = logText.cssStyles;
    this.combos = logText.combos;
  }
}
