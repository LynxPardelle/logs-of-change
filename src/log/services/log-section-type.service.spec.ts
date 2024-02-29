import { Test, TestingModule } from '@nestjs/testing';
import { LogSectionTypeService } from './log-section-type.service';

describe('LogSectionTypeService', () => {
  let service: LogSectionTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogSectionTypeService],
    }).compile();

    service = module.get<LogSectionTypeService>(LogSectionTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
