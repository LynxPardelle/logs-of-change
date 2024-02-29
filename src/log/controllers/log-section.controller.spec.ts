import { Test, TestingModule } from '@nestjs/testing';
import { LogSectionController } from './log-section.controller';

describe('LogSectionController', () => {
  let controller: LogSectionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogSectionController],
    }).compile();

    controller = module.get<LogSectionController>(LogSectionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
