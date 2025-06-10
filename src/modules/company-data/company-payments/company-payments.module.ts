import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompanyPaymentsService } from './company-payments.service';
import { CompanyPaymentsResolver } from './company-payments.resolver';
import { CompanyPayments } from './entities/company-payments.entity';
import { Company } from '@/modules/companies/entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyPayments, Company])],
  providers: [CompanyPaymentsResolver, CompanyPaymentsService],
  exports: [CompanyPaymentsService],
})
export class CompanyPaymentsModule {}
