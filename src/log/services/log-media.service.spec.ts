import { Test, TestingModule } from '@nestjs/testing';
import { LogMediaService } from './log-media.service';

describe('LogMediaService', () => {
  let service: LogMediaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogMediaService],
    }).compile();

    service = module.get<LogMediaService>(LogMediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
