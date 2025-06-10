import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CompanySocialsService } from './company-socials.service';
import { CompanySocialsResolver } from './company-socials.resolver';
import { CompanySocials } from './entities/company-socials.entity';
import { CompanySocial } from './entities/company-social.entity';
import { Company } from '@/modules/companies/entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CompanySocials, CompanySocial, Company])],
  providers: [CompanySocialsResolver, CompanySocialsService],
  exports: [CompanySocialsService],
})
export class CompanySocialsModule {}
