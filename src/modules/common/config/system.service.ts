// src/modules/common/config/system.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { Role, RoleType } from '../../auth/entities/role.entity';
import { UserRole } from '../../auth/entities/user-role.entity';

@Injectable()
export class SystemService implements OnModuleInit {
  private readonly logger = new Logger(SystemService.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
  ) {}

  async onModuleInit() {
    await this.ensureMainOrganization();
    await this.ensureSuperAdmin();
  }

  private async ensureMainOrganization(): Promise<Organization> {
    let organization = await this.organizationRepository.findOne({
      where: { slug: 'main-organization' },
    });

    if (!organization) {
      const orgName = this.configService.get<string>('ORGANIZATION_NAME', 'Main Organization');
      const orgDescription = this.configService.get<string>(
        'ORGANIZATION_DESCRIPTION',
        'Organização principal do sistema',
      );
      const orgLogo = this.configService.get<string>('ORGANIZATION_LOGO');
      const orgBanner = this.configService.get<string>('ORGANIZATION_BANNER');

      organization = this.organizationRepository.create({
        name: orgName,
        slug: 'main-organization',
        description: orgDescription,
        logo: orgLogo,
        banner: orgBanner,
        isActive: true,
      });

      organization = await this.organizationRepository.save(organization);
      this.logger.log(`Created main organization: ${orgName}`);
    }

    return organization;
  }

  private async ensureSuperAdmin(): Promise<User | undefined> {
    const adminEmail = this.configService.get<string>('SUPER_ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('SUPER_ADMIN_PASSWORD');

    if (!adminEmail || !adminPassword) {
      this.logger.warn(
        'SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in environment variables',
      );
      return undefined;
    }

    let superAdmin = await this.userRepository.findOne({
      where: { email: adminEmail },
      relations: ['userRoles', 'userRoles.role'],
    });

    const organization = await this.organizationRepository.findOne({
      where: { slug: 'main-organization' },
    });

    if (!superAdmin) {
      const adminName = this.configService.get<string>('SUPER_ADMIN_NAME', 'Super Admin');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      if (!organization) {
        this.logger.error('Main organization not found. Cannot create super admin user.');
        return undefined;
      }

      superAdmin = this.userRepository.create({
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        isVerified: true,
        isActive: true,
        organizationId: organization.id,
      });

      superAdmin = await this.userRepository.save(superAdmin);
      this.logger.log(`Created super admin user: ${adminEmail}`);
    } else {
      // Atualizar senha se mudou
      const passwordValid = await bcrypt.compare(adminPassword, superAdmin.password);
      if (!passwordValid) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await this.userRepository.update(superAdmin.id, { password: hashedPassword });
        this.logger.log('Updated super admin password');
      }
    }

    // Garantir que tem role de SUPER_ADMIN
    const superAdminRole = await this.roleRepository.findOne({
      where: { name: RoleType.SUPER_ADMIN },
    });

    if (superAdminRole) {
      const existingUserRole = await this.userRoleRepository.findOne({
        where: { userId: superAdmin.id, roleId: superAdminRole.id },
      });

      if (!existingUserRole) {
        const userRole = this.userRoleRepository.create({
          userId: superAdmin.id,
          roleId: superAdminRole.id,
        });
        await this.userRoleRepository.save(userRole);
        this.logger.log('Assigned SUPER_ADMIN role to admin user');
      }
    }

    return superAdmin;
  }

  async getMainOrganization(): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { slug: 'main-organization' },
    });
    if (!organization) {
      throw new Error('Main organization not found');
    }
    return organization;
  }
}
