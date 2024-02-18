import { logDAO } from '../DAOs/factory';
import LogRepository from './log.repository';

export const _logRepository = new LogRepository(logDAO);
