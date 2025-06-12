// src/modules/company-data/company-delivery/company-delivery.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompanyDeliveryService } from './company-delivery.service';
import { CompanyDeliveryResolver } from './company-delivery.resolver';
import { CompanyDelivery } from './entities/company-delivery.entity';
import { DeliveryZone } from './entities/delivery-zone.entity';
import { Company } from '@/modules/companies/entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyDelivery, DeliveryZone, Company])],
  providers: [CompanyDeliveryResolver, CompanyDeliveryService],
  exports: [CompanyDeliveryService],
})
export class CompanyDeliveryModule {}