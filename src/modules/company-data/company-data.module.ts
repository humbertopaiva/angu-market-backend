// src/modules/company-data/company-data.module.ts
import { Module } from '@nestjs/common';
import { CompanyBasicInfoModule } from './company-basic-info/company-basic-info.module';
import { CompanyPaymentsModule } from './company-payments/company-payments.module';
import { CompanySocialsModule } from './company-socials/company-socials.module';
import { CompanyScheduleModule } from './company-schedule/company-schedule.module';
import { CompanyDeliveryModule } from './company-delivery/company-delivery.module';

@Module({
  imports: [
    CompanyBasicInfoModule,
    CompanyPaymentsModule,
    CompanySocialsModule,
    CompanyScheduleModule,
    CompanyDeliveryModule, // CORREÇÃO: Adicionar CompanyDeliveryModule
  ],
  exports: [
    CompanyBasicInfoModule,
    CompanyPaymentsModule,
    CompanySocialsModule,
    CompanyScheduleModule,
    CompanyDeliveryModule, // CORREÇÃO: Exportar CompanyDeliveryModule
  ],
})
export class CompanyDataModule {}