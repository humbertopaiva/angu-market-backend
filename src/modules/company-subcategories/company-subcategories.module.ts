import { Module } from '@nestjs/common';
import { CompanySubcategoriesService } from './company-subcategories.service';
import { CompanySubcategoriesResolver } from './company-subcategories.resolver';

@Module({
  providers: [CompanySubcategoriesResolver, CompanySubcategoriesService],
})
export class CompanySubcategoriesModule {}
