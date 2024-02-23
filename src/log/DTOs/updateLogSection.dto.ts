import { IsString, IsNotEmpty } from '@nestjs/class-validator';
import { TLogSectionUpdateDTO } from '../types/logSection.type';
import { CreateLogSectionDTO } from './createLogSection.dto';

export class UpdateLogSectionDTO
  extends CreateLogSectionDTO
  implements TLogSectionUpdateDTO
{
  @IsString()
  @IsNotEmpty()
  public _id: string;
  constructor(logSection: TLogSectionUpdateDTO) {
    super(logSection);
    this._id = logSection._id;
  }
}
