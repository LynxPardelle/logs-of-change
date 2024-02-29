import { Test, TestingModule } from '@nestjs/testing';
import { LogSectionService } from './log-section.service';

describe('LogSectionService', () => {
  let service: LogSectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogSectionService],
    }).compile();

    service = module.get<LogSectionService>(LogSectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
