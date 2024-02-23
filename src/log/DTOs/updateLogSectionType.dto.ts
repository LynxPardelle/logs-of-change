import { IsString, IsNotEmpty } from '@nestjs/class-validator';
import { TLogSectionTypeUpdateDTO } from '../types/logSectionType.type';
import { CreateLogSectionTypeDTO } from './createLogSectionType.dto';

export class UpdateLogSectionTypeDTO
  extends CreateLogSectionTypeDTO
  implements TLogSectionTypeUpdateDTO
{
  @IsString()
  @IsNotEmpty()
  public _id: string;
  constructor(logSectionType: TLogSectionTypeUpdateDTO) {
    super(logSectionType);
    this._id = logSectionType._id;
  }
}
