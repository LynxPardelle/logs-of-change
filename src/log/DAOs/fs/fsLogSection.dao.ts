import { Injectable } from '@nestjs/common';
/* Types */
import { TLogSectionDAO } from '@src/log/types/daoLog.type';
import { TLogSection } from '@src/log/types/logSection.type';
import { TSearch } from '@src/shared/types/search.type';
/* DTOs */
import { CreateLogSectionDTO } from '@src/log/DTOs/createLogSection.dto';
import { UpdateLogSectionDTO } from '@src/log/DTOs/updateLogSection.dto';
/* Libs */
import * as fs from 'fs';
@Injectable()
export class FSLogSectionDAO implements TLogSectionDAO {
  async create(data: CreateLogSectionDTO): Promise<TLogSection> {
    try {
      const logSections: TLogSection[] = await this.readLogSectionsFile();
      const newLogSection: TLogSection = {
        ...data,
        _id: (logSections.length + 1).toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      logSections.push(newLogSection);
      await fs.promises.writeFile(
        'src/log/data/logSections.json',
        JSON.stringify(logSections),
      );
      return newLogSection;
    } catch (error) {
      throw new Error('Error creating log section');
    }
  }
  async read(id: string): Promise<TLogSection> {
    try {
      const logSections: TLogSection[] = await this.readLogSectionsFile();
      const logSection: TLogSection | undefined = logSections.find(
        (logSection) => logSection._id === id,
      );
      if (!logSection) throw new Error('Log section not found');
      return logSection;
    } catch (error) {
      throw new Error('Error reading log section');
    }
  }
  async readAll(args?: TSearch<TLogSection>): Promise<TLogSection[]> {
    try {
      const logSections: TLogSection[] = await this.readLogSectionsFile();
      return logSections;
    } catch (error) {
      throw new Error('Error reading log sections');
    }
  }
  async update(data: UpdateLogSectionDTO): Promise<TLogSection> {
    try {
      const logSections: TLogSection[] = await this.readLogSectionsFile();
      const logSectionIndex: number = logSections.findIndex(
        (logSection) => logSection._id === data._id,
      );
      if (logSectionIndex === -1) throw new Error('Log section not found');
      logSections[logSectionIndex] = {
        ...logSections[logSectionIndex],
        ...data,
        updatedAt: new Date(),
      };
      await fs.promises.writeFile(
        'src/log/data/logSections.json',
        JSON.stringify(logSections),
      );
      return logSections[logSectionIndex];
    } catch (error) {
      throw new Error('Error updating log section');
    }
  }
  async delete(id: string): Promise<TLogSection> {
    try {
      const logSections: TLogSection[] = await this.readLogSectionsFile();
      const logSectionIndex: number = logSections.findIndex(
        (logSection) => logSection._id === id,
      );
      if (logSectionIndex === -1) throw new Error('Log section not found');
      const deletedLogSection: TLogSection = logSections.splice(
        logSectionIndex,
        1,
      )[0];
      await fs.promises.writeFile(
        'src/log/data/logSections.json',
        JSON.stringify(logSections),
      );
      return deletedLogSection;
    } catch (error) {
      throw new Error('Error deleting log section');
    }
  }
  private async readLogSectionsFile(): Promise<TLogSection[]> {
    try {
      let logSections: TLogSection[] = [];
      const logSectionsFile: string = await fs.promises.readFile(
        'src/log/data/logSections.json',
        'utf-8',
      );
      if (!!logSectionsFile) {
        logSections = JSON.parse(logSectionsFile);
      }
      return logSections;
    } catch (error) {
      throw new Error('Error reading log sections file');
    }
  }
}
