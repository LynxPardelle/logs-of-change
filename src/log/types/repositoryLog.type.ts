/* Types */
import { TRepository } from '@src/shared/types/repository.type';
import { TChangeLog } from './changeLog.type';
import { TLog } from './log.type';
import { TLogMedia } from './logMedia.type';
import { TLogSection } from './logSection.type';
import { TLogSectionType } from './logSectionType.type';
import { TLogText } from './logText.type';
/* DTOS */
import { CreateChangeLogDTO } from '../DTOs/createChangeLog.dto';
import { UpdateChangeLogDTO } from '../DTOs/updateChangeLog.dto';
import { CreateLogDTO } from '../DTOs/createLog.dto';
import { UpdateLogDTO } from '../DTOs/updateLog.dto';
import { CreateLogMediaDTO } from '../DTOs/createLogMedia.dto';
import { UpdateLogMediaDTO } from '../DTOs/updateLogMedia.dto';
import { CreateLogSectionDTO } from '../DTOs/createLogSection.dto';
import { UpdateLogSectionDTO } from '../DTOs/updateLogSection.dto';
import { CreateLogSectionTypeDTO } from '../DTOs/createLogSectionType.dto';
import { UpdateLogSectionTypeDTO } from '../DTOs/updateLogSectionType.dto';
import { CreateLogTextDTO } from '../DTOs/createLogText.dto';
import { UpdateLogTextDTO } from '../DTOs/updateLogText.dto';
import { TSearch } from '@src/shared/types/search.type';

export type TChangeLogRepository = TRepository<
  CreateChangeLogDTO,
  { projectId: string },
  undefined,
  TSearch<TChangeLog>,
  UpdateChangeLogDTO,
  undefined,
  undefined,
  TChangeLog
>;

export type TLogRepository = TRepository<
  CreateLogDTO,
  { changeLogId: string },
  undefined,
  TSearch<TLog>,
  UpdateLogDTO,
  undefined,
  undefined,
  TLog
>;

export type TLogMediaRepository = TRepository<
  CreateLogMediaDTO,
  { logSectionId: string },
  undefined,
  TSearch<TLogMedia>,
  UpdateLogMediaDTO,
  undefined,
  undefined,
  TLogMedia
>;

export type TLogSectionRepository = TRepository<
  CreateLogSectionDTO,
  { logId: string },
  undefined,
  TSearch<TLogSection>,
  UpdateLogSectionDTO,
  undefined,
  undefined,
  TLogSection
>;

export type TLogSectionTypeRepository = TRepository<
  CreateLogSectionTypeDTO,
  undefined,
  undefined,
  TSearch<TLogSectionType>,
  UpdateLogSectionTypeDTO,
  undefined,
  undefined,
  TLogSectionType
>;

export type TLogTextRepository = TRepository<
  CreateLogTextDTO,
  { logSectionId: string },
  undefined,
  TSearch<TLogText>,
  UpdateLogTextDTO,
  undefined,
  undefined,
  TLogText
>;
