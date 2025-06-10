import { Module } from '@nestjs/common';
import { CompanyBasicInfoModule } from './company-basic-info/company-basic-info.module';
import { CompanyPaymentsModule } from './company-payments/company-payments.module';

@Module({
  imports: [
    CompanyBasicInfoModule,
    CompanyPaymentsModule, // ADIÇÃO
    // Futuros submódulos:
    // CompanySocialsModule,
    // CompanyScheduleModule,
    // etc...
  ],
  exports: [
    CompanyBasicInfoModule,
    CompanyPaymentsModule, // ADIÇÃO
    // Futuros submódulos...
  ],
})
export class CompanyDataModule {}
