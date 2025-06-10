import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompanyBasicInfoService } from './company-basic-info.service';
import { CompanyBasicInfoResolver } from './company-basic-info.resolver';
import { CompanyBasicInfo } from './entities/company-basic-info.entity';
import { Company } from '@/modules/companies/entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyBasicInfo, Company])],
  providers: [CompanyBasicInfoResolver, CompanyBasicInfoService],
  exports: [CompanyBasicInfoService],
})
export class CompanyBasicInfoModule {}
