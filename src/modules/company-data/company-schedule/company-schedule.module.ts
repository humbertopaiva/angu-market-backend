import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompanyScheduleService } from './company-schedule.service';
import { CompanyScheduleResolver } from './company-schedule.resolver';
import { CompanySchedule } from './entities/company-schedule.entity';
import { CompanyScheduleHour } from './entities/company-schedule-hour.entity';
import { Company } from '@/modules/companies/entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CompanySchedule, CompanyScheduleHour, Company])],
  providers: [CompanyScheduleResolver, CompanyScheduleService],
  exports: [CompanyScheduleService],
})
export class CompanyScheduleModule {}
