import {
  IsString,
  IsNotEmpty,
  IsDate,
  IsOptional,
} from '@nestjs/class-validator';
import { TLogMediaUpdateDTO } from '../types/logMedia.type';
import { CreateLogMediaDTO } from './createLogMedia.dto';

export class UpdateLogMediaDTO
  extends CreateLogMediaDTO
  implements TLogMediaUpdateDTO
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
  constructor(logMedia: TLogMediaUpdateDTO) {
    super(logMedia);
    this._id = logMedia._id;
  }
}
