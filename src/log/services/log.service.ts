import { Injectable } from '@nestjs/common';
import LogRepository from '@src/log/repositories/log.repository';

@Injectable()
export class LogService {
  constructor(private _logRepository: LogRepository) {}
  author(): { [key: string]: string } {
    return {
      author: 'Lynx Pardelle',
      site: 'https://lynxpardelle.com',
      github: 'https://github.com/LynxPardelle',
    };
  }
}
