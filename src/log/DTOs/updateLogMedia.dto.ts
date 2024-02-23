import { IsString, IsNotEmpty } from '@nestjs/class-validator';
import { TLogMediaUpdateDTO } from '../types/logMedia.type';
import { CreateLogMediaDTO } from './createLogMedia.dto';

export class UpdateLogMediaDTO
  extends CreateLogMediaDTO
  implements TLogMediaUpdateDTO
{
  @IsString()
  @IsNotEmpty()
  public _id: string;
  constructor(logMedia: TLogMediaUpdateDTO) {
    super(logMedia);
    this._id = logMedia._id;
  }
}
