import { Module } from '@nestjs/common';
import { CompanyCategoriesService } from './company-categories.service';
import { CompanyCategoriesResolver } from './company-categories.resolver';

@Module({
  providers: [CompanyCategoriesResolver, CompanyCategoriesService],
})
export class CompanyCategoriesModule {}
