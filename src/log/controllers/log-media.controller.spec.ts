import { Test, TestingModule } from '@nestjs/testing';
import { LogMediaController } from './log-media.controller';

describe('LogMediaController', () => {
  let controller: LogMediaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogMediaController],
    }).compile();

    controller = module.get<LogMediaController>(LogMediaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
