import { Injectable } from '@nestjs/common';
/* Types */
import { TLogSectionTypeDAO } from '@src/log/types/daoLog.type';
import { TLogSectionType } from '@src/log/types/logSectionType.type';
import { TSearch } from '@src/shared/types/search.type';
/* DTOs */
import { CreateLogSectionTypeDTO } from '@src/log/DTOs/createLogSectionType.dto';
import { UpdateLogSectionTypeDTO } from '@src/log/DTOs/updateLogSectionType.dto';
/* Libs */
import * as fs from 'fs';
@Injectable()
export class FSLogSectionTypeDAO implements TLogSectionTypeDAO {
  async create(data: CreateLogSectionTypeDTO): Promise<TLogSectionType> {
    try {
      const logSectionTypes: TLogSectionType[] =
        await this.readLogSectionTypesFile();
      const newLogSectionType: TLogSectionType = {
        ...data,
        _id: (logSectionTypes.length + 1).toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      logSectionTypes.push(newLogSectionType);
      await fs.promises.writeFile(
        'src/log/data/logSectionTypes.json',
        JSON.stringify(logSectionTypes),
      );
      return newLogSectionType;
    } catch (error) {
      throw new Error('Error creating log section type');
    }
  }
  async read(id: string): Promise<TLogSectionType> {
    try {
      const logSectionTypes: TLogSectionType[] =
        await this.readLogSectionTypesFile();
      const logSectionType: TLogSectionType | undefined = logSectionTypes.find(
        (logSectionType) => logSectionType._id === id,
      );
      if (!logSectionType) throw new Error('Log section type not found');
      return logSectionType;
    } catch (error) {
      throw new Error('Error reading log section type');
    }
  }
  async readAll(args?: TSearch<TLogSectionType>): Promise<TLogSectionType[]> {
    try {
      const logSectionTypes: TLogSectionType[] =
        await this.readLogSectionTypesFile();
      return logSectionTypes;
    } catch (error) {
      throw new Error('Error reading log section types');
    }
  }
  async update(data: UpdateLogSectionTypeDTO): Promise<TLogSectionType> {
    try {
      const logSectionTypes: TLogSectionType[] =
        await this.readLogSectionTypesFile();
      const logSectionTypeIndex: number = logSectionTypes.findIndex(
        (logSectionType) => logSectionType._id === data._id,
      );
      if (logSectionTypeIndex === -1)
        throw new Error('Log section type not found');
      logSectionTypes[logSectionTypeIndex] = {
        ...logSectionTypes[logSectionTypeIndex],
        ...data,
        updatedAt: new Date(),
      };
      await fs.promises.writeFile(
        'src/log/data/logSectionTypes.json',
        JSON.stringify(logSectionTypes),
      );
      return logSectionTypes[logSectionTypeIndex];
    } catch (error) {
      throw new Error('Error updating log section type');
    }
  }
  async delete(id: string): Promise<TLogSectionType> {
    try {
      const logSectionTypes: TLogSectionType[] =
        await this.readLogSectionTypesFile();
      const logSectionTypeIndex: number = logSectionTypes.findIndex(
        (logSectionType) => logSectionType._id === id,
      );
      if (logSectionTypeIndex === -1)
        throw new Error('Log section type not found');
      const deletedLogSectionType: TLogSectionType =
        logSectionTypes[logSectionTypeIndex];
      logSectionTypes.splice(logSectionTypeIndex, 1);
      await fs.promises.writeFile(
        'src/log/data/logSectionTypes.json',
        JSON.stringify(logSectionTypes),
      );
      return deletedLogSectionType;
    } catch (error) {
      throw new Error('Error deleting log section type');
    }
  }
  private async readLogSectionTypesFile(): Promise<TLogSectionType[]> {
    try {
      let logSectionTypes: TLogSectionType[] = [];
      const logSectionTypesFile: string = await fs.promises.readFile(
        'src/log/data/logSectionTypes.json',
        'utf-8',
      );
      if (!!logSectionTypesFile) {
        logSectionTypes = JSON.parse(logSectionTypesFile);
      }
      return logSectionTypes;
    } catch (error) {
      throw new Error('Error reading log section types');
    }
  }
}
