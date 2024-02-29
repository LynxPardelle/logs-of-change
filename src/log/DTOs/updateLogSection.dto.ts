import {
  IsString,
  IsNotEmpty,
  IsDate,
  IsOptional,
} from '@nestjs/class-validator';
import { TLogSectionUpdateDTO } from '../types/logSection.type';
import { CreateLogSectionDTO } from './createLogSection.dto';

export class UpdateLogSectionDTO
  extends CreateLogSectionDTO
  implements TLogSectionUpdateDTO
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
  constructor(logSection: TLogSectionUpdateDTO) {
    super(logSection);
    this._id = logSection._id;
  }
}
