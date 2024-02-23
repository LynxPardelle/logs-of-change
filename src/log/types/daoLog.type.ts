/* Types */
import { TDAO } from '@src/shared/types/dao.type';
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

export type TChangeLogDAO = TDAO<
  CreateChangeLogDTO,
  TSearch<TChangeLog>,
  UpdateChangeLogDTO,
  TChangeLog
>;

export type TLogDAO = TDAO<CreateLogDTO, TSearch<TLog>, UpdateLogDTO, TLog>;

export type TLogMediaDAO = TDAO<
  CreateLogMediaDTO,
  TSearch<TLogMedia>,
  UpdateLogMediaDTO,
  TLogMedia
>;

export type TLogSectionDAO = TDAO<
  CreateLogSectionDTO,
  TSearch<TLogSection>,
  UpdateLogSectionDTO,
  TLogSection
>;

export type TLogSectionTypeDAO = TDAO<
  CreateLogSectionTypeDTO,
  TSearch<TLogSectionType>,
  UpdateLogSectionTypeDTO,
  TLogSectionType
>;

export type TLogTextDAO = TDAO<
  CreateLogTextDTO,
  TSearch<TLogText>,
  UpdateLogTextDTO,
  TLogText
>;
