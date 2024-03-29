import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
} from '@nestjs/class-validator';
import { TChangeLogUpdateDTO } from '../types/changeLog.type';
import { CreateChangeLogDTO } from './createChangeLog.dto';

export class UpdateChangeLogDTO
  extends CreateChangeLogDTO
  implements TChangeLogUpdateDTO
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
  constructor(changeLog: TChangeLogUpdateDTO) {
    super(changeLog);
    this._id = changeLog?._id;
  }
}
