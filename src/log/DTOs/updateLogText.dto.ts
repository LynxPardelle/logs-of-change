import {
  IsString,
  IsNotEmpty,
  IsDate,
  IsOptional,
} from '@nestjs/class-validator';
import { TLogTextUpdateDTO } from '../types/logText.type';
import { CreateLogTextDTO } from './createLogText.dto';

export class UpdateLogTextDTO
  extends CreateLogTextDTO
  implements TLogTextUpdateDTO
{
  @IsString()
  @IsNotEmpty()
  public _id: string;
  @IsDate()
  @IsOptional()
  public createdAt: Date;
  @IsDate()
  @IsOptional()
  public updatedAt: Date;
  constructor(logText: TLogTextUpdateDTO) {
    super(logText);
    this._id = logText._id;
  }
}
