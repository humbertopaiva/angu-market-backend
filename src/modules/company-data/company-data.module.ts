import { Module } from '@nestjs/common';
import { CompanyBasicInfoModule } from './company-basic-info/company-basic-info.module';
import { CompanyPaymentsModule } from './company-payments/company-payments.module';
import { CompanySocialsModule } from './company-socials/company-socials.module';
import { CompanyScheduleModule } from './company-schedule/company-schedule.module';

@Module({
  imports: [
    CompanyBasicInfoModule,
    CompanyPaymentsModule,
    CompanySocialsModule,
    CompanyScheduleModule, // ADIÇÃO
    // Futuros submódulos:
    // CompanyDeliveryModule,
    // CompanyReviewsModule,
    // etc...
  ],
  exports: [
    CompanyBasicInfoModule,
    CompanyPaymentsModule,
    CompanySocialsModule,
    CompanyScheduleModule, // ADIÇÃO
    // Futuros submódulos...
  ],
})
export class CompanyDataModule {}
