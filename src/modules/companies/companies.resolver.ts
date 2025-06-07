// src/modules/companies/companies.resolver.ts - COMPLETE VERSION

import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards, Logger, ForbiddenException } from '@nestjs/common';

import { CompaniesService } from './companies.service';
import { Company } from './entities/company.entity';
import { CreateCompanyInput } from './dto/create-company.input';
import { UpdateCompanyInput } from './dto/update-company.input';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../auth/entities/role.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Resolver(() => Company)
export class CompaniesResolver {
  private readonly logger = new Logger(CompaniesResolver.name);

  constructor(private readonly companiesService: CompaniesService) {}

  // ===== BASIC COMPANY OPERATIONS =====

  /**
   * Criar nova empresa
   * Permitido: SUPER_ADMIN, PLACE_ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Mutation(() => Company)
  async createCompany(
    @Args('createCompanyInput') createCompanyInput: CreateCompanyInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('=== CREATE COMPANY RESOLVER DEBUG START ===');
    this.logger.debug('CreateCompanyInput:', createCompanyInput);
    this.logger.debug('Current user:', {
      id: currentUser?.id,
      email: currentUser?.email,
    });

    try {
      const result = await this.companiesService.create(createCompanyInput, currentUser);
      this.logger.debug('Company created successfully:', {
        id: result.id,
        name: result.name,
        placeId: result.placeId,
        placeName: result.place?.name,
      });
      return result;
    } catch (error) {
      this.logger.error('Error creating company:', error.message);
      throw error;
    }
  }

  /**
   * Listar todas as empresas
   * Público (sem autenticação)
   */
  @Query(() => [Company], { name: 'companies' })
  async findAll() {
    this.logger.debug('=== COMPANIES RESOLVER FIND ALL DEBUG START ===');

    try {
      const companies = await this.companiesService.findAll();
      this.logger.debug(`Resolver returning ${companies.length} companies`);

      // Log das empresas encontradas para debug
      companies.forEach((company, index) => {
        this.logger.debug(`Company ${index + 1} in resolver:`, {
          id: company.id,
          name: company.name,
          placeId: company.placeId,
          placeName: company.place?.name || 'No place data',
        });
      });

      this.logger.debug('=== COMPANIES RESOLVER FIND ALL DEBUG END ===');
      return companies;
    } catch (error) {
      this.logger.error('=== COMPANIES RESOLVER FIND ALL ERROR ===');
      this.logger.error('Error:', error.message);
      throw error;
    }
  }

  /**
   * Buscar empresas do usuário logado
   * Requer autenticação
   */
  @UseGuards(JwtAuthGuard)
  @Query(() => [Company], { name: 'myCompanies' })
  findByCurrentUser(@CurrentUser() currentUser: User) {
    this.logger.debug('Finding companies for current user:', {
      id: currentUser?.id,
      email: currentUser?.email,
    });
    return this.companiesService.findByUser(currentUser);
  }

  /**
   * Buscar empresa por ID
   * Público (sem autenticação)
   */
  @Query(() => Company, { name: 'company' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    this.logger.debug('Finding company by ID:', id);
    return this.companiesService.findOne(id);
  }

  /**
   * Buscar empresa por slug
   * Público (sem autenticação)
   */
  @Query(() => Company, { name: 'companyBySlug' })
  findBySlug(@Args('slug', { type: () => String }) slug: string) {
    this.logger.debug('Finding company by slug:', slug);
    return this.companiesService.findBySlug(slug);
  }

  /**
   * Buscar empresas por place
   * Público (sem autenticação)
   */
  @Query(() => [Company], { name: 'companiesByPlace' })
  findByPlace(@Args('placeId', { type: () => Int }) placeId: number) {
    this.logger.debug('Finding companies by place:', placeId);
    return this.companiesService.findByPlace(placeId);
  }

  /**
   * Atualizar empresa
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => Company)
  updateCompany(
    @Args('updateCompanyInput') updateCompanyInput: UpdateCompanyInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Updating company:', {
      companyId: updateCompanyInput.id,
      currentUser: currentUser?.email,
    });
    return this.companiesService.update(updateCompanyInput.id, updateCompanyInput, currentUser);
  }

  /**
   * Remover empresa
   * Permitido: SUPER_ADMIN, PLACE_ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Mutation(() => Boolean)
  async removeCompany(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() currentUser: User,
  ): Promise<boolean> {
    this.logger.debug('=== REMOVE COMPANY RESOLVER DEBUG START ===');
    this.logger.debug('Company ID to remove:', id);

    try {
      await this.companiesService.remove(id, currentUser);
      this.logger.debug('Company removed successfully');
      this.logger.debug('=== REMOVE COMPANY RESOLVER DEBUG END ===');
      return true;
    } catch (error) {
      this.logger.error('Error removing company:', error.message);
      throw error;
    }
  }

  // ===== COMPANY ADMIN MANAGEMENT =====

  /**
   * Atribuir usuário como admin de uma empresa
   * Permitido: SUPER_ADMIN, PLACE_ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Mutation(() => Company)
  async assignCompanyAdmin(
    @Args('companyId', { type: () => Int }) companyId: number,
    @Args('userId', { type: () => Int }) userId: number,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('=== ASSIGN COMPANY ADMIN RESOLVER DEBUG START ===');
    this.logger.debug('Company ID:', companyId);
    this.logger.debug('User ID:', userId);
    this.logger.debug('Current user:', {
      id: currentUser?.id,
      email: currentUser?.email,
    });

    try {
      const result = await this.companiesService.assignCompanyAdmin(companyId, userId, currentUser);
      this.logger.debug('Company admin assigned successfully');
      return result;
    } catch (error) {
      this.logger.error('Error assigning company admin:', error.message);
      throw error;
    }
  }

  /**
   * Remover usuário como admin de uma empresa
   * Permitido: SUPER_ADMIN, PLACE_ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Mutation(() => Company)
  async removeCompanyAdmin(
    @Args('companyId', { type: () => Int }) companyId: number,
    @Args('userId', { type: () => Int }) userId: number,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('=== REMOVE COMPANY ADMIN RESOLVER DEBUG START ===');
    this.logger.debug('Company ID:', companyId);
    this.logger.debug('User ID:', userId);

    try {
      const result = await this.companiesService.removeCompanyAdmin(companyId, userId, currentUser);
      this.logger.debug('Company admin removed successfully');
      return result;
    } catch (error) {
      this.logger.error('Error removing company admin:', error.message);
      throw error;
    }
  }

  /**
   * Buscar usuários disponíveis para serem admin de empresa
   * Permitido: SUPER_ADMIN, PLACE_ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Query(() => [User], { name: 'availableCompanyAdmins' })
  async getAvailableCompanyAdmins(
    @Args('placeId', { type: () => Int }) placeId: number,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Getting available company admins for place:', placeId);

    // Validar acesso ao place
    const userRoles = currentUser.userRoles?.map(ur => ur.role.name) || [];

    if (!userRoles.includes(RoleType.SUPER_ADMIN)) {
      if (userRoles.includes(RoleType.PLACE_ADMIN) && currentUser.placeId !== placeId) {
        throw new ForbiddenException('Você não tem permissão para acessar usuários deste place');
      }
    }

    return this.companiesService.getAvailableCompanyAdmins(placeId);
  }

  // ===== COMPANY WITH USERS OPERATIONS =====

  /**
   * Criar empresa com usuários associados
   * Permitido: SUPER_ADMIN, PLACE_ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Mutation(() => Company)
  async createCompanyWithUsers(
    @Args('createCompanyInput') createCompanyInput: CreateCompanyInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('=== CREATE COMPANY WITH USERS RESOLVER DEBUG START ===');
    this.logger.debug('CreateCompanyInput:', createCompanyInput);

    try {
      const result = await this.companiesService.createWithUsers(createCompanyInput, currentUser);
      this.logger.debug('Company with users created successfully:', {
        id: result.id,
        name: result.name,
        usersCount: result.users?.length || 0,
      });
      return result;
    } catch (error) {
      this.logger.error('Error creating company with users:', error.message);
      throw error;
    }
  }

  /**
   * Buscar usuários disponíveis para uma empresa (sem empresa ou sem conflito)
   * Permitido: SUPER_ADMIN, PLACE_ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Query(() => [User], { name: 'availableUsersForCompany' })
  async getAvailableUsersForCompany(
    @Args('placeId', { type: () => Int }) placeId: number,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Getting available users for company in place:', placeId);

    // Validar acesso ao place
    const userRoles = currentUser.userRoles?.map(ur => ur.role.name) || [];

    if (!userRoles.includes(RoleType.SUPER_ADMIN)) {
      if (userRoles.includes(RoleType.PLACE_ADMIN) && currentUser.placeId !== placeId) {
        throw new ForbiddenException('Você não tem permissão para acessar usuários deste place');
      }
    }

    return this.companiesService.getAvailableUsersForCompany(placeId);
  }

  // ===== COMPANY STATISTICS & REPORTS =====

  /**
   * Buscar empresas que não têm admin
   * Permitido: SUPER_ADMIN, PLACE_ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Query(() => [Company], { name: 'companiesWithoutAdmin' })
  async getCompaniesWithoutAdmin(
    @Args('placeId', { type: () => Int, nullable: true }) placeId?: number,
    @CurrentUser() currentUser?: User,
  ) {
    this.logger.debug('Getting companies without admin');

    // Se for place admin, só pode ver empresas do seu place
    if (currentUser) {
      const userRoles = currentUser.userRoles?.map(ur => ur.role.name) || [];

      if (userRoles.includes(RoleType.PLACE_ADMIN)) {
        placeId = currentUser.placeId || placeId;
      }
    }

    return this.companiesService.getCompaniesWithoutAdmin(placeId);
  }

  // ===== COMPANY AUTHENTICATION =====
  // Nota: A mutation companyLogin está no AuthResolver, não aqui
  // mas poderia ser movida para cá se preferir organização por entidade

  // ===== UTILITY QUERIES =====

  /**
   * Buscar empresas com contagem de usuários
   * Permitido: SUPER_ADMIN, PLACE_ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Query(() => [Company], { name: 'companiesWithUserCount' })
  async getCompaniesWithUserCount(
    @Args('placeId', { type: () => Int, nullable: true }) placeId?: number,
    @CurrentUser() currentUser?: User,
  ) {
    this.logger.debug('Getting companies with user count');

    // Aplicar filtro de place se for place admin
    if (currentUser) {
      const userRoles = currentUser.userRoles?.map(ur => ur.role.name) || [];

      if (userRoles.includes(RoleType.PLACE_ADMIN)) {
        placeId = currentUser.placeId || placeId;
      }
    }

    if (placeId) {
      return this.companiesService.findByPlace(placeId);
    } else {
      return this.companiesService.findAll();
    }
  }

  /**
   * Buscar empresa com todos os relacionamentos
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN (própria empresa)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Query(() => Company, { name: 'companyDetails' })
  async getCompanyDetails(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Getting company details:', { companyId: id, userId: currentUser?.id });

    // Company admin só pode ver detalhes da própria empresa
    const userRoles = currentUser.userRoles?.map(ur => ur.role.name) || [];

    if (userRoles.includes(RoleType.COMPANY_ADMIN)) {
      if (currentUser.companyId !== id) {
        throw new ForbiddenException('Você só pode acessar detalhes da sua própria empresa');
      }
    }

    // Place admin só pode ver empresas do seu place
    if (userRoles.includes(RoleType.PLACE_ADMIN)) {
      const company = await this.companiesService.findOne(id);
      if (company.placeId !== currentUser.placeId) {
        throw new ForbiddenException('Você só pode acessar empresas do seu place');
      }
    }

    // Use o método específico que carrega todos os detalhes dos usuários
    return this.companiesService.findOneWithUsersDetails(id);
  }
}
