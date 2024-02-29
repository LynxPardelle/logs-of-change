import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
} from '@nestjs/class-validator';
import { TLogUpdateDTO } from '../types/log.type';
import { CreateLogDTO } from './createLog.dto';

export class UpdateLogDTO extends CreateLogDTO implements TLogUpdateDTO {
  @IsString()
  @IsNotEmpty()
  public _id: string;
  @IsDate()
  @IsOptional()
  public createdAt: Date;
  @IsDate()
  @IsOptional()
  public updatedAt: Date;
  constructor(log: TLogUpdateDTO) {
    super(log);
    this._id = log._id;
  }
}
