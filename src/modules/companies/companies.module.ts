// src/modules/companies/companies.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompaniesService } from './companies.service';
import { CompaniesResolver } from './companies.resolver';
import { Company } from './entities/company.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company]),
    // NestjsQueryGraphQLModule.forFeature({
    //   imports: [NestjsQueryTypeOrmModule.forFeature([Company])],
    //   resolvers: [
    //     {
    //       DTOClass: Company,
    //       EntityClass: Company,
    //       CreateDTOClass: CreateCompanyInput,
    //       UpdateDTOClass: UpdateCompanyInput,
    //       enableAggregate: true,
    //       // CORREÇÃO: Usar apenas o custom resolver para listagem
    //       read: { disabled: false },
    //       create: { disabled: true },
    //       update: { disabled: true },
    //       delete: { disabled: true },
    //     },
    //   ],
    // }),
  ],
  providers: [CompaniesResolver, CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
