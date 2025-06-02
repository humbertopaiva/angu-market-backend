import { Module } from '@nestjs/common';
import { SegmentsService } from './segments.service';
import { SegmentsResolver } from './segments.resolver';

@Module({
  providers: [SegmentsResolver, SegmentsService],
})
export class SegmentsModule {}
