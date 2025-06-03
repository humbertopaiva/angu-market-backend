/* eslint-disable @typescript-eslint/no-unused-vars */
// src/modules/common/config/system.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

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
    await this.ensureRoles();
    await this.ensureMainOrganization();
    await this.ensureSuperAdmin();
  }

  private async ensureRoles(): Promise<void> {
    const roles = [
      {
        name: RoleType.SUPER_ADMIN,
        description: 'Super Administrador com acesso total ao sistema',
      },
      {
        name: RoleType.ORGANIZATION_ADMIN,
        description: 'Administrador da organização',
      },
      {
        name: RoleType.PLACE_ADMIN,
        description: 'Administrador do place',
      },
      {
        name: RoleType.COMPANY_ADMIN,
        description: 'Administrador da empresa',
      },
      {
        name: RoleType.COMPANY_STAFF,
        description: 'Funcionário da empresa',
      },
      {
        name: RoleType.PUBLIC_USER,
        description: 'Usuário público',
      },
    ];

    for (const roleData of roles) {
      let role = await this.roleRepository.findOne({
        where: { name: roleData.name },
      });

      if (!role) {
        role = this.roleRepository.create({
          name: roleData.name,
          description: roleData.description,
          isActive: true,
        });

        // Garantir que o role tenha UUID
        if (!role.uuid) {
          role.uuid = uuidv4();
        }

        await this.roleRepository.save(role);
        this.logger.log(`Created role: ${roleData.name}`);
      } else if (!role.uuid) {
        // Atualizar role existente sem UUID
        await this.roleRepository.update(role.id, { uuid: uuidv4() });
        this.logger.log(`Updated UUID for role: ${roleData.name}`);
      }
    }
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

      // Garantir que a organização tenha UUID
      if (!organization.uuid) {
        organization.uuid = uuidv4();
      }

      organization = await this.organizationRepository.save(organization);
      this.logger.log(`Created main organization: ${orgName}`);
    } else if (!organization.uuid) {
      // Atualizar organização existente sem UUID
      await this.organizationRepository.update(organization.id, { uuid: uuidv4() });
      this.logger.log('Updated UUID for main organization');
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

    // Buscar usuário incluindo o campo password
    let superAdmin = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .where('user.email = :email', { email: adminEmail })
      .getOne();

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

      // Garantir que o usuário tenha UUID
      if (!superAdmin.uuid) {
        superAdmin.uuid = uuidv4();
      }

      superAdmin = await this.userRepository.save(superAdmin);
      this.logger.log(`Created super admin user: ${adminEmail}`);
    } else {
      // Atualizar senha e garantir UUID se necessário
      const updates: any = {};

      // Verificar se a senha precisa ser atualizada (apenas se o password existir)
      if (superAdmin.password) {
        try {
          const passwordValid = await bcrypt.compare(adminPassword, superAdmin.password);
          if (!passwordValid) {
            updates.password = await bcrypt.hash(adminPassword, 10);
            this.logger.log('Updated super admin password');
          }
        } catch (error) {
          this.logger.warn('Error comparing passwords, updating password');
          updates.password = await bcrypt.hash(adminPassword, 10);
        }
      } else {
        // Se não tem password, criar um novo
        updates.password = await bcrypt.hash(adminPassword, 10);
        this.logger.log('Set super admin password (was missing)');
      }

      if (!superAdmin.uuid) {
        updates.uuid = uuidv4();
        this.logger.log('Generated UUID for super admin');
      }

      if (Object.keys(updates).length > 0) {
        await this.userRepository.update(superAdmin.id, updates);
        // Recarregar o usuário com as atualizações
        superAdmin = await this.userRepository
          .createQueryBuilder('user')
          .leftJoinAndSelect('user.userRoles', 'userRoles')
          .leftJoinAndSelect('userRoles.role', 'role')
          .where('user.id = :id', { id: superAdmin.id })
          .getOne();
      }
    }

    // Garantir que tem role de SUPER_ADMIN
    const superAdminRole = await this.roleRepository.findOne({
      where: { name: RoleType.SUPER_ADMIN },
    });

    if (superAdminRole && superAdmin) {
      const existingUserRole = await this.userRoleRepository.findOne({
        where: { userId: superAdmin.id, roleId: superAdminRole.id },
      });

      if (!existingUserRole) {
        const userRole = this.userRoleRepository.create({
          userId: superAdmin.id,
          roleId: superAdminRole.id,
        });

        // Garantir que o userRole tenha UUID
        if (!userRole.uuid) {
          userRole.uuid = uuidv4();
        }

        await this.userRoleRepository.save(userRole);
        this.logger.log('Assigned SUPER_ADMIN role to admin user');
      }
    }

    return superAdmin ?? undefined;
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
