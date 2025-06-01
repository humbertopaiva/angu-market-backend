import { Test, TestingModule } from '@nestjs/testing';
import { BasesResolver } from './bases.resolver';
import { BasesService } from './bases.service';

describe('BasesResolver', () => {
  let resolver: BasesResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BasesResolver, BasesService],
    }).compile();

    resolver = module.get<BasesResolver>(BasesResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
