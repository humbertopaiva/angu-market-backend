import { Module } from '@nestjs/common';
import { BasesService } from './bases.service';
import { BasesResolver } from './bases.resolver';

@Module({
  providers: [BasesResolver, BasesService],
})
export class BasesModule {}
