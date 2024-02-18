import { Injectable } from '@nestjs/common';

@Injectable()
export class LogService {
  author(): { [key: string]: string } {
    return {
      author: 'Lynx Pardelle',
      site: 'https://lynxpardelle.com',
    };
  }
}
