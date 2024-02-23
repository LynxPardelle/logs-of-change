import { IsString, IsNotEmpty } from '@nestjs/class-validator';
import { TLogTextUpdateDTO } from '../types/logText.type';
import { CreateLogTextDTO } from './createLogText.dto';

export class UpdateLogTextDTO
  extends CreateLogTextDTO
  implements TLogTextUpdateDTO
{
  @IsString()
  @IsNotEmpty()
  public _id: string;
  constructor(logText: TLogTextUpdateDTO) {
    super(logText);
    this._id = logText._id;
  }
}
