import { Test, TestingModule } from '@nestjs/testing';
import { LogTextController } from './log-text.controller';

describe('LogTextController', () => {
  let controller: LogTextController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogTextController],
    }).compile();

    controller = module.get<LogTextController>(LogTextController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
