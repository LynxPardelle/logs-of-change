import { Test, TestingModule } from '@nestjs/testing';
import { LogTextService } from './log-text.service';

describe('LogTextService', () => {
  let service: LogTextService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogTextService],
    }).compile();

    service = module.get<LogTextService>(LogTextService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
