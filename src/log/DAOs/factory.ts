import config from '../../config/config';
import { FSLogDAO } from './fs/log.dao';
import { MemoryLogDAO } from './memory/log.dao';
import { MongoDBLogDAO } from './mongo/log.dao';

export let logDAO;

switch (config.persistence) {
  case 'mongodb':
    logDAO = new MongoDBLogDAO();
    logDAO = new MongoDBLogDAO();
    break;
  case 'fs':
    logDAO = new FSLogDAO();
    break;
  default:
    logDAO = new MemoryLogDAO();
    break;
}
