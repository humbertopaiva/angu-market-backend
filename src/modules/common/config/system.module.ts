// src/modules/common/config/system.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { SystemService } from './system.service';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../auth/entities/role.entity';
import { UserRole } from '../../auth/entities/user-role.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Organization, User, Role, UserRole])],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
