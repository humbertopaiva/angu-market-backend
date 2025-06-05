// src/modules/companies/companies.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Company } from './entities/company.entity';

import { UpdateCompanyInput } from './dto/update-company.input';
import { User } from '../users/entities/user.entity';
import { Role, RoleType } from '../auth/entities/role.entity';
import { UserRole } from '../auth/entities/user-role.entity';
import { CreateCompanyInput } from './dto/create-company.input';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
  ) {}

  private validatePlaceAccess(placeId: number, user: User): void {
    this.logger.debug('=== VALIDATE PLACE ACCESS DEBUG START ===');
    this.logger.debug('PlaceId:', placeId);
    this.logger.debug('User:', {
      id: user?.id,
      email: user?.email,
      placeId: user?.placeId,
      userRoles:
        user?.userRoles?.map(ur => ({
          id: ur.id,
          roleId: ur.roleId,
          roleName: ur.role?.name,
        })) || 'no userRoles',
    });

    const userRoles = user.userRoles?.map(ur => ur.role.name) || [];
    this.logger.debug('Extracted user roles:', userRoles);

    // Super admin pode acessar qualquer place
    if (userRoles.includes(RoleType.SUPER_ADMIN)) {
      this.logger.debug('User is SUPER_ADMIN, access granted');
      return;
    }

    // Place admin só pode gerenciar empresas de seu place
    if (userRoles.includes(RoleType.PLACE_ADMIN)) {
      this.logger.debug('User is PLACE_ADMIN, checking place access');
      this.logger.debug('User placeId:', user.placeId);
      this.logger.debug('Requested placeId:', placeId);

      if (user.placeId !== placeId) {
        this.logger.error('Place admin trying to access different place');
        throw new ForbiddenException('Você não tem permissão para gerenciar empresas deste place');
      }
      this.logger.debug('Place admin has access to this place');
      return;
    }

    this.logger.error('User has no valid roles for company management');
    throw new ForbiddenException('Você não tem permissão para gerenciar empresas');
  }

  async create(createCompanyInput: CreateCompanyInput, currentUser: User): Promise<Company> {
    this.logger.debug('=== CREATE COMPANY DEBUG START ===');
    this.logger.debug('CreateCompanyInput:', createCompanyInput);
    this.logger.debug('CurrentUser:', {
      id: currentUser?.id,
      email: currentUser?.email,
      placeId: currentUser?.placeId,
    });

    const { slug, placeId, ...companyData } = createCompanyInput;

    try {
      // Validar acesso ao place
      this.logger.debug('Validating place access...');
      this.validatePlaceAccess(placeId, currentUser);
      this.logger.debug('Place access validated successfully');

      // Verificar se já existe uma empresa com o mesmo slug
      this.logger.debug('Checking for existing company with slug:', slug);
      const existingCompany = await this.companyRepository.findOne({
        where: { slug },
      });

      if (existingCompany) {
        this.logger.error('Company with slug already exists:', slug);
        throw new BadRequestException(`Já existe uma empresa com o slug: ${slug}`);
      }
      this.logger.debug('No existing company found with slug:', slug);

      // Filtrar campos undefined/null antes de criar
      const cleanedData = Object.fromEntries(
        Object.entries(companyData).filter(
          ([, value]) => value !== undefined && value !== null && value !== '',
        ),
      );

      // Se latitude/longitude são 0, remover para não causar problemas
      if (cleanedData.latitude === 0) delete cleanedData.latitude;
      if (cleanedData.longitude === 0) delete cleanedData.longitude;

      this.logger.debug('Cleaned company data:', cleanedData);

      const company = this.companyRepository.create({
        ...cleanedData,
        slug,
        placeId,
      });

      this.logger.debug('Company entity created, saving...');
      const savedCompany = await this.companyRepository.save(company);

      this.logger.debug('Company saved successfully:', {
        id: savedCompany.id,
        name: savedCompany.name,
        slug: savedCompany.slug,
        placeId: savedCompany.placeId,
      });

      // Buscar empresa completa com relacionamentos
      const completeCompany = await this.companyRepository.findOne({
        where: { id: savedCompany.id },
        relations: ['place', 'category', 'subcategory'],
      });

      this.logger.debug('=== CREATE COMPANY DEBUG END ===');
      return completeCompany || savedCompany;
    } catch (error) {
      this.logger.error('=== CREATE COMPANY ERROR ===');
      this.logger.error('Error type:', error.constructor.name);
      this.logger.error('Error message:', error.message);
      this.logger.error('Error stack:', error.stack);
      throw error;
    }
  }

  // Novo método para criar empresa com usuários
  async createWithUsers(
    createCompanyInput: CreateCompanyInput,
    currentUser: User,
  ): Promise<Company> {
    this.logger.debug('=== CREATE COMPANY WITH USERS DEBUG START ===');
    this.logger.debug('CreateCompanyInput:', createCompanyInput);

    const { users, ...companyData } = createCompanyInput;

    try {
      // Criar a empresa primeiro (usar método existente)
      const company = await this.create(companyData as any, currentUser);
      this.logger.debug('Company created:', { id: company.id, name: company.name });

      // Processar usuários se fornecidos
      if (users && users.length > 0) {
        await this.processCompanyUsers(users, company.id);
      }

      // Retornar empresa completa com usuários
      const completeCompany = await this.companyRepository.findOne({
        where: { id: company.id },
        relations: {
          place: true,
          users: {
            userRoles: {
              role: true,
            },
          },
          category: true,
          subcategory: true,
        },
      });

      this.logger.debug('=== CREATE COMPANY WITH USERS DEBUG END ===');
      return completeCompany || company;
    } catch (error) {
      this.logger.error('=== CREATE COMPANY WITH USERS ERROR ===');
      this.logger.error('Error:', error.message);
      throw error;
    }
  }

  private async processCompanyUsers(users: any[], companyId: number): Promise<void> {
    this.logger.debug('Processing company users:', { count: users.length, companyId });

    for (const userData of users) {
      try {
        if (userData.existingUserId) {
          // Atribuir usuário existente à empresa
          await this.assignExistingUserToCompany(userData.existingUserId, companyId);
        } else if (userData.name && userData.email && userData.password) {
          // Criar novo usuário para a empresa
          await this.createNewUserForCompany(userData, companyId);
        }
      } catch (error) {
        this.logger.error(`Error processing user: ${error.message}`);
        // Continuar processando outros usuários mesmo se um falhar
      }
    }
  }

  private async assignExistingUserToCompany(userId: number, companyId: number): Promise<void> {
    this.logger.debug('Assigning existing user to company:', { userId, companyId });

    // Buscar o usuário
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['userRoles', 'userRoles.role'],
    });

    if (!user) {
      throw new BadRequestException(`Usuário com ID ${userId} não encontrado`);
    }

    // Buscar a empresa para verificar o place
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['place'],
    });

    if (!company) {
      throw new BadRequestException(`Empresa com ID ${companyId} não encontrada`);
    }

    // Validar permissões (usuário deve ser do mesmo place)
    if (user.placeId !== company.placeId) {
      throw new BadRequestException('Usuário deve ser do mesmo place da empresa');
    }

    // Atualizar o usuário para ser da empresa
    await this.userRepository.update(userId, { companyId });

    // Verificar se o usuário já tem uma role adequada para empresa
    const userRoles = user.userRoles?.map(ur => ur.role.name) || [];
    const companyRoles = [RoleType.COMPANY_ADMIN, RoleType.COMPANY_STAFF];

    if (!userRoles.some(role => companyRoles.includes(role))) {
      // Atribuir role de COMPANY_STAFF por padrão
      const staffRole = await this.roleRepository.findOne({
        where: { name: RoleType.COMPANY_STAFF },
      });

      if (staffRole) {
        const userRole = this.userRoleRepository.create({
          userId: user.id,
          roleId: staffRole.id,
        });
        await this.userRoleRepository.save(userRole);
      }
    }

    this.logger.debug('User assigned to company successfully');
  }

  private async createNewUserForCompany(userData: any, companyId: number): Promise<void> {
    this.logger.debug('Creating new user for company:', {
      userData: { ...userData, password: '[HIDDEN]' },
      companyId,
    });

    // Verificar se email já existe
    const existingUser = await this.userRepository.findOne({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new BadRequestException(`Usuário com email ${userData.email} já existe`);
    }

    // Buscar empresa para obter placeId e organizationId
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['place', 'place.organization'],
    });

    if (!company) {
      throw new BadRequestException(`Empresa com ID ${companyId} não encontrada`);
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Criar o usuário
    const user = this.userRepository.create({
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      phone: userData.phone || null,
      isVerified: true, // Usuários criados por admin são verificados automaticamente
      isActive: userData.isActive !== false,
      organizationId: company.place.organization?.id || company.place.organizationId,
      placeId: company.placeId,
      companyId: companyId,
    });

    const savedUser = await this.userRepository.save(user);
    this.logger.debug('User created:', { id: savedUser.id, email: savedUser.email });

    // Atribuir role apropriada
    const roleName =
      userData.role === 'COMPANY_ADMIN' ? RoleType.COMPANY_ADMIN : RoleType.COMPANY_STAFF;
    const role = await this.roleRepository.findOne({
      where: { name: roleName },
    });

    if (role) {
      const userRole = this.userRoleRepository.create({
        userId: savedUser.id,
        roleId: role.id,
      });
      await this.userRoleRepository.save(userRole);
      this.logger.debug('Role assigned:', { userId: savedUser.id, roleName });
    }
  }

  // Método para buscar usuários disponíveis para uma empresa (mesmo place)
  async getAvailableUsersForCompany(placeId: number): Promise<User[]> {
    return this.userRepository.find({
      where: {
        placeId,
        companyId: IsNull(),
        isActive: true,
      },
      relations: ['userRoles', 'userRoles.role'],
      order: { name: 'ASC' },
    });
  }

  async findAll(): Promise<Company[]> {
    this.logger.debug('=== FIND ALL COMPANIES DEBUG START ===');

    try {
      const companies = await this.companyRepository.find({
        relations: {
          place: true,
          category: true,
          subcategory: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });

      this.logger.debug(`Found ${companies.length} companies`);

      // Log das empresas encontradas para debug
      companies.forEach((company, index) => {
        this.logger.debug(`Company ${index + 1}:`, {
          id: company.id,
          name: company.name,
          slug: company.slug,
          placeId: company.placeId,
          placeName: company.place?.name || 'No place loaded',
          isActive: company.isActive,
        });
      });

      this.logger.debug('=== FIND ALL COMPANIES DEBUG END ===');
      return companies;
    } catch (error) {
      this.logger.error('=== FIND ALL COMPANIES ERROR ===');
      this.logger.error('Error type:', error.constructor.name);
      this.logger.error('Error message:', error.message);
      this.logger.error('Error stack:', error.stack);
      throw error;
    }
  }

  async findOne(id: number): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: {
        place: true,
        users: true,
        category: true,
        subcategory: true,
      },
    });

    if (!company) {
      throw new NotFoundException(`Empresa com ID ${id} não encontrada`);
    }

    return company;
  }

  async findBySlug(slug: string): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { slug },
      relations: {
        place: true,
        users: true,
        category: true,
        subcategory: true,
      },
    });

    if (!company) {
      throw new NotFoundException(`Empresa com slug ${slug} não encontrada`);
    }

    return company;
  }

  async findByPlace(placeId: number): Promise<Company[]> {
    return this.companyRepository.find({
      where: { placeId },
      relations: {
        place: true,
        category: true,
        subcategory: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findByUser(user: User): Promise<Company[]> {
    const userRoles = user.userRoles?.map(ur => ur.role.name) || [];

    // Super admin pode ver todas
    if (userRoles.includes(RoleType.SUPER_ADMIN)) {
      return this.findAll();
    }

    // Place admin pode ver todas do seu place
    if (userRoles.includes(RoleType.PLACE_ADMIN) && user.placeId) {
      return this.findByPlace(user.placeId);
    }

    // Company admin/staff pode ver apenas sua empresa
    if (user.companyId) {
      const company = await this.findOne(user.companyId);
      return [company];
    }

    return [];
  }

  async update(
    id: number,
    updateCompanyInput: UpdateCompanyInput,
    currentUser: User,
  ): Promise<Company> {
    const { slug, placeId } = updateCompanyInput;

    // Verifica se a empresa existe
    const company = await this.findOne(id);

    // Validar acesso
    this.validatePlaceAccess(company.placeId, currentUser);

    // Se está atualizando o place, validar acesso ao novo place também
    if (placeId && placeId !== company.placeId) {
      this.validatePlaceAccess(placeId, currentUser);
    }

    // Se está atualizando o slug, verifica se já existe outra empresa com o mesmo slug
    if (slug && slug !== company.slug) {
      const existingCompany = await this.companyRepository.findOne({
        where: { slug },
      });

      if (existingCompany && existingCompany.id !== id) {
        throw new BadRequestException(`Já existe uma empresa com o slug: ${slug}`);
      }
    }

    await this.companyRepository.update(id, updateCompanyInput);
    return this.findOne(id);
  }

  async remove(id: number, currentUser: User): Promise<void> {
    this.logger.debug('=== REMOVE COMPANY DEBUG START ===');
    this.logger.debug('Company ID to remove:', id);

    // Buscar a empresa para validar acesso
    const company = await this.findOne(id);
    this.logger.debug('Company found for deletion:', {
      id: company.id,
      name: company.name,
      slug: company.slug,
    });

    // Validar acesso
    this.validatePlaceAccess(company.placeId, currentUser);

    // Deletar a empresa
    await this.companyRepository.remove(company);

    this.logger.debug('Company removed successfully');
    this.logger.debug('=== REMOVE COMPANY DEBUG END ===');
  }

  /**
   * Atribuir um usuário como admin de uma empresa
   */
  async assignCompanyAdmin(companyId: number, userId: number, currentUser: User): Promise<Company> {
    this.logger.debug('=== ASSIGN COMPANY ADMIN SERVICE DEBUG START ===');
    this.logger.debug('Company ID:', companyId);
    this.logger.debug('User ID:', userId);

    try {
      // Buscar a empresa
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
        relations: ['place'],
      });

      if (!company) {
        throw new BadRequestException(`Empresa com ID ${companyId} não encontrada`);
      }

      // Validar acesso ao place da empresa
      this.validatePlaceAccess(company.placeId, currentUser);

      // Buscar o usuário
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['userRoles', 'userRoles.role'],
      });

      if (!user) {
        throw new BadRequestException(`Usuário com ID ${userId} não encontrado`);
      }

      // Validar que o usuário é do mesmo place
      if (user.placeId !== company.placeId) {
        throw new BadRequestException('Usuário deve ser do mesmo place da empresa');
      }

      // Verificar se o usuário já tem uma empresa
      if (user.companyId && user.companyId !== companyId) {
        throw new BadRequestException('Usuário já está associado a outra empresa');
      }

      // Buscar a role de COMPANY_ADMIN
      const adminRole = await this.roleRepository.findOne({
        where: { name: RoleType.COMPANY_ADMIN },
      });

      if (!adminRole) {
        throw new BadRequestException('Role de COMPANY_ADMIN não encontrada');
      }

      // Remover roles de empresa existentes (caso o usuário já seja admin/staff de alguma empresa)
      const existingCompanyRoles =
        user.userRoles?.filter(ur =>
          [RoleType.COMPANY_ADMIN, RoleType.COMPANY_STAFF].includes(ur.role.name),
        ) || [];

      for (const userRole of existingCompanyRoles) {
        await this.userRoleRepository.remove(userRole);
      }

      // Atribuir a empresa ao usuário
      await this.userRepository.update(userId, { companyId });

      // Atribuir a role de COMPANY_ADMIN
      const newUserRole = this.userRoleRepository.create({
        userId,
        roleId: adminRole.id,
      });
      await this.userRoleRepository.save(newUserRole);

      this.logger.debug('Company admin assigned successfully');

      // Retornar empresa completa com relacionamentos
      return this.findOne(companyId);
    } catch (error) {
      this.logger.error('=== ASSIGN COMPANY ADMIN SERVICE ERROR ===');
      this.logger.error('Error:', error.message);
      throw error;
    }
  }

  /**
   * Remover um usuário como admin de uma empresa
   */
  async removeCompanyAdmin(companyId: number, userId: number, currentUser: User): Promise<Company> {
    this.logger.debug('=== REMOVE COMPANY ADMIN SERVICE DEBUG START ===');
    this.logger.debug('Company ID:', companyId);
    this.logger.debug('User ID:', userId);

    try {
      // Buscar a empresa
      const company = await this.findOne(companyId);

      // Validar acesso ao place da empresa
      this.validatePlaceAccess(company.placeId, currentUser);

      // Buscar o usuário
      const user = await this.userRepository.findOne({
        where: { id: userId, companyId },
        relations: ['userRoles', 'userRoles.role'],
      });

      if (!user) {
        throw new BadRequestException('Usuário não é admin desta empresa');
      }

      // Remover roles de empresa
      const companyRoles =
        user.userRoles?.filter(ur =>
          [RoleType.COMPANY_ADMIN, RoleType.COMPANY_STAFF].includes(ur.role.name),
        ) || [];

      for (const userRole of companyRoles) {
        await this.userRoleRepository.remove(userRole);
      }

      // Remover associação com a empresa
      await this.userRepository.update(userId, { companyId: undefined });

      // Buscar role de PUBLIC_USER para atribuir ao usuário
      const publicRole = await this.roleRepository.findOne({
        where: { name: RoleType.PUBLIC_USER },
      });

      if (publicRole) {
        const newUserRole = this.userRoleRepository.create({
          userId,
          roleId: publicRole.id,
        });
        await this.userRoleRepository.save(newUserRole);
      }

      this.logger.debug('Company admin removed successfully');

      // Retornar empresa completa com relacionamentos
      return this.findOne(companyId);
    } catch (error) {
      this.logger.error('=== REMOVE COMPANY ADMIN SERVICE ERROR ===');
      this.logger.error('Error:', error.message);
      throw error;
    }
  }

  /**
   * Buscar usuários disponíveis para serem admin de empresa
   */
  async getAvailableCompanyAdmins(placeId: number): Promise<User[]> {
    this.logger.debug('Getting available company admins for place:', placeId);

    try {
      // Buscar usuários do place que:
      // 1. Não têm empresa associada OU
      // 2. Têm apenas role de PUBLIC_USER ou COMPANY_STAFF
      const users = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.userRoles', 'userRole')
        .leftJoinAndSelect('userRole.role', 'role')
        .leftJoinAndSelect('user.company', 'company')
        .where('user.placeId = :placeId', { placeId })
        .andWhere('user.isActive = :isActive', { isActive: true })
        .andWhere('user.isVerified = :isVerified', { isVerified: true })
        .orderBy('user.name', 'ASC')
        .getMany();

      // Filtrar usuários que podem se tornar company admin
      const availableUsers = users.filter(user => {
        const userRoles = user.userRoles?.map(ur => ur.role.name) || [];

        // Não pode ser super admin ou place admin
        if (userRoles.includes(RoleType.SUPER_ADMIN) || userRoles.includes(RoleType.PLACE_ADMIN)) {
          return false;
        }

        // Se já é company admin, pode ser reatribuído
        // Se é public user ou company staff, pode ser promovido
        return true;
      });

      this.logger.debug(`Found ${availableUsers.length} available users`);
      return availableUsers;
    } catch (error) {
      this.logger.error('Error getting available company admins:', error.message);
      throw error;
    }
  }

  /**
   * Buscar empresas que não têm admin
   */
  async getCompaniesWithoutAdmin(placeId?: number): Promise<Company[]> {
    this.logger.debug('Getting companies without admin');

    try {
      let query = this.companyRepository
        .createQueryBuilder('company')
        .leftJoinAndSelect('company.place', 'place')
        .leftJoin('company.users', 'user')
        .leftJoin('user.userRoles', 'userRole')
        .leftJoin('userRole.role', 'role')
        .where('role.name = :roleName OR role.name IS NULL', { roleName: RoleType.COMPANY_ADMIN })
        .groupBy('company.id')
        .addGroupBy('place.id')
        .having('COUNT(CASE WHEN role.name = :roleName THEN 1 END) = 0', {
          roleName: RoleType.COMPANY_ADMIN,
        })
        .orderBy('company.name', 'ASC');

      if (placeId) {
        query = query.andWhere('company.placeId = :placeId', { placeId });
      }

      const companies = await query.getMany();
      this.logger.debug(`Found ${companies.length} companies without admin`);
      return companies;
    } catch (error) {
      this.logger.error('Error getting companies without admin:', error.message);
      throw error;
    }
  }
}
