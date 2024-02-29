import { Test, TestingModule } from '@nestjs/testing';
import { LogSectionTypeController } from './log-section-type.controller';

describe('LogSectionTypeController', () => {
  let controller: LogSectionTypeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogSectionTypeController],
    }).compile();

    controller = module.get<LogSectionTypeController>(LogSectionTypeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
