import { Injectable } from '@nestjs/common';
/* Types */
import { TLogTextDAO } from '@src/log/types/daoLog.type';
import { TLogText } from '@src/log/types/logText.type';
import { TSearch } from '@src/shared/types/search.type';
/* DTOs */
import { CreateLogTextDTO } from '@src/log/DTOs/createLogText.dto';
import { UpdateLogTextDTO } from '@src/log/DTOs/updateLogText.dto';
/* Libs */
import * as fs from 'fs';
@Injectable()
export class FSLogTextDAO implements TLogTextDAO {
  async create(data: CreateLogTextDTO): Promise<TLogText> {
    try {
      const logTexts: TLogText[] = await this.readLogTextsFile();
      const newLogText: TLogText = {
        ...data,
        _id: (logTexts.length + 1).toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      logTexts.push(newLogText);
      await fs.promises.writeFile(
        'src/log/data/logTexts.json',
        JSON.stringify(logTexts),
      );
      return newLogText;
    } catch (error) {
      throw new Error('Error creating log text');
    }
  }
  async read(id: string): Promise<TLogText> {
    try {
      const logTexts: TLogText[] = await this.readLogTextsFile();
      const logText: TLogText | undefined = logTexts.find(
        (logText) => logText._id === id,
      );
      if (!logText) throw new Error('Log text not found');
      return logText;
    } catch (error) {
      throw new Error('Error reading log text');
    }
  }
  async readAll(args?: TSearch<TLogText>): Promise<TLogText[]> {
    try {
      const logTexts: TLogText[] = await this.readLogTextsFile();
      return logTexts;
    } catch (error) {
      throw new Error('Error reading log texts');
    }
  }
  async update(logText: UpdateLogTextDTO): Promise<TLogText> {
    try {
      const logTexts: TLogText[] = await this.readLogTextsFile();
      const logTextIndex: number = logTexts.findIndex(
        (logText) => logText._id === logText._id,
      );
      if (logTextIndex === -1) throw new Error('Log text not found');
      logTexts[logTextIndex] = {
        ...logTexts[logTextIndex],
        ...logText,
        updatedAt: new Date(),
      };
      await fs.promises.writeFile(
        'src/log/data/logTexts.json',
        JSON.stringify(logTexts),
      );
      return logTexts[logTextIndex];
    } catch (error) {
      throw new Error('Error updating log text');
    }
  }
  async delete(id: string): Promise<TLogText> {
    try {
      const logTexts: TLogText[] = await this.readLogTextsFile();
      const logTextIndex: number = logTexts.findIndex(
        (logText) => logText._id === id,
      );
      if (logTextIndex === -1) throw new Error('Log text not found');
      const deletedLogText: TLogText = logTexts.splice(logTextIndex, 1)[0];
      await fs.promises.writeFile(
        'src/log/data/logTexts.json',
        JSON.stringify(logTexts),
      );
      return deletedLogText;
    } catch (error) {
      throw new Error('Error deleting log text');
    }
  }
  private async readLogTextsFile(): Promise<TLogText[]> {
    try {
      let logTexts: TLogText[] = [];
      const logTextsFile: string = await fs.promises.readFile(
        'src/log/data/logTexts.json',
        'utf8',
      );
      logTexts = JSON.parse(logTextsFile);
      return logTexts;
    } catch (error) {
      throw new Error('Error reading log texts');
    }
  }
}
