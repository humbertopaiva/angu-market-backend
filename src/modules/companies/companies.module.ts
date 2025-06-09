// src/modules/companies/companies.module.ts - CORRIGIDO
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompaniesService } from './companies.service';
import { CompaniesResolver } from './companies.resolver';
import { Company } from './entities/company.entity';

// ADIÇÃO: Importar entidades necessárias para injeção de dependência
import { User } from '../users/entities/user.entity';
import { Role } from '../auth/entities/role.entity';
import { UserRole } from '../auth/entities/user-role.entity';
import { Segment } from '../segments/entities/segment.entity';
import { Category } from '../segments/entities/company-category.entity';
import { Subcategory } from '../segments/entities/company-subcategory.entity';

@Module({
  imports: [
    // CORREÇÃO: Adicionar todas as entidades que o CompaniesService precisa
    TypeOrmModule.forFeature([
      Company,
      User, // Necessário para UserRepository
      Role, // Necessário para RoleRepository
      UserRole, // Necessário para UserRoleRepository
      Segment,
      Category,
      Subcategory,
    ]),
  ],
  providers: [CompaniesResolver, CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
