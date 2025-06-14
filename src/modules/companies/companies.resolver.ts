// src/modules/companies/companies.resolver.ts - COMPLETO COM HIERARQUIA DE SEGMENTAÇÃO

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
   * Criar nova empresa com hierarquia obrigatória
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
        segmentId: result.segmentId,
        segmentName: result.segment?.name,
        categoryId: result.categoryId,
        categoryName: result.category?.name,
        subcategoryId: result.subcategoryId,
        subcategoryName: result.subcategory?.name,
      });
      return result;
    } catch (error) {
      this.logger.error('Error creating company:', error.message);
      throw error;
    }
  }

  /**
   * Criar empresa com usuários
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
        segmentName: result.segment?.name,
        categoryName: result.category?.name,
        subcategoryName: result.subcategory?.name,
      });
      return result;
    } catch (error) {
      this.logger.error('Error creating company with users:', error.message);
      throw error;
    }
  }

  /**
 * Listar todas as empresas
 * CORRIGIR: Adicionar autenticação e controle de acesso
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
@Query(() => [Company], { name: 'companies' })
async findAll(@CurrentUser() currentUser: User) {
  this.logger.debug('=== COMPANIES RESOLVER FIND ALL DEBUG START ===');
  this.logger.debug('Current User:', {
    id: currentUser?.id,
    email: currentUser?.email,
    roles: currentUser?.userRoles?.map(ur => ur.role.name) || []
  });

  try {
    const userRoles = currentUser.userRoles?.map(ur => ur.role.name) || [];
    
    // Se for PLACE_ADMIN, filtrar apenas empresas do seu place
    if (userRoles.includes(RoleType.PLACE_ADMIN) && !userRoles.includes(RoleType.SUPER_ADMIN)) {
      if (!currentUser.placeId) {
        throw new ForbiddenException('Place Admin deve estar associado a um place');
      }
      this.logger.debug('Place Admin - filtering by place:', currentUser.placeId);
      return this.companiesService.findByPlace(currentUser.placeId);
    }
    
    // Super Admin pode ver todas
    const companies = await this.companiesService.findAll();
    this.logger.debug(`Resolver returning ${companies.length} companies`);

    // Log das empresas encontradas para debug
    companies.forEach((company, index) => {
      this.logger.debug(`Company ${index + 1} in resolver:`, {
        id: company.id,
        name: company.name,
        placeId: company.placeId,
        placeName: company.place?.name || 'No place data',
        segmentName: company.segment?.name || 'No segment',
        categoryName: company.category?.name || 'No category',
        subcategoryName: company.subcategory?.name || 'No subcategory',
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

  // ===== QUERIES POR SEGMENTAÇÃO =====

  /**
   * Buscar empresas por segmento
   * Público (sem autenticação)
   */
  @Query(() => [Company], { name: 'companiesBySegment' })
  findBySegment(@Args('segmentId', { type: () => Int }) segmentId: number) {
    this.logger.debug('Finding companies by segment:', segmentId);
    return this.companiesService.findBySegment(segmentId);
  }

  /**
   * Buscar empresas por categoria
   * Público (sem autenticação)
   */
  @Query(() => [Company], { name: 'companiesByCategory' })
  findByCategory(@Args('categoryId', { type: () => Int }) categoryId: number) {
    this.logger.debug('Finding companies by category:', categoryId);
    return this.companiesService.findByCategory(categoryId);
  }

  /**
   * Buscar empresas por subcategoria
   * Público (sem autenticação)
   */
  @Query(() => [Company], { name: 'companiesBySubcategory' })
  findBySubcategory(@Args('subcategoryId', { type: () => Int }) subcategoryId: number) {
    this.logger.debug('Finding companies by subcategory:', subcategoryId);
    return this.companiesService.findBySubcategory(subcategoryId);
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
   * Atribuir admin a uma empresa
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
    this.logger.debug('Assigning company admin:', { companyId, userId });
    return this.companiesService.assignCompanyAdmin(companyId, userId, currentUser);
  }

  /**
   * Remover admin de uma empresa
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
    this.logger.debug('Removing company admin:', { companyId, userId });
    return this.companiesService.removeCompanyAdmin(companyId, userId, currentUser);
  }

 /**
   * Buscar admins disponíveis para uma empresa
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
    this.logger.debug('Getting companies without admin', { placeId });

    const userRoles = currentUser?.userRoles?.map(ur => ur.role.name) || [];

    // Validar acesso
    if (!userRoles.includes(RoleType.SUPER_ADMIN)) {
      if (userRoles.includes(RoleType.PLACE_ADMIN)) {
        if (!currentUser?.placeId) {
          throw new ForbiddenException('Usuário PLACE_ADMIN deve estar associado a um place');
        }
        placeId = currentUser.placeId;
      } else {
        throw new ForbiddenException('Usuário não tem permissão para esta operação');
      }
    }

    // Usar o service para buscar empresas sem admin
    return this.companiesService.getCompaniesWithoutAdmin(placeId);
  }

  /**
   * Buscar empresas com segmentação incompleta
   * Permitido: SUPER_ADMIN, PLACE_ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Query(() => [Company], { name: 'companiesWithIncompleteSegmentation' })
  async getCompaniesWithIncompleteSegmentation() {
    this.logger.debug('Getting companies with incomplete segmentation');
    return this.companiesService.findCompaniesWithIncompleteSegmentation();
  }

  /**
   * Obter estatísticas de segmentação
   * Permitido: SUPER_ADMIN, PLACE_ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Query(() => String, { name: 'segmentationStats' }) // Retornar como string JSON
  async getSegmentationStats(
    @Args('placeId', { type: () => Int, nullable: true }) placeId?: number,
    @CurrentUser() currentUser?: User,
  ): Promise<string> {
    this.logger.debug('Getting segmentation stats');

    // Se for place admin, só pode ver stats do seu place
    if (currentUser) {
      const userRoles = currentUser.userRoles?.map(ur => ur.role.name) || [];

      if (userRoles.includes(RoleType.PLACE_ADMIN)) {
        placeId = currentUser.placeId || placeId;
      }
    }

    const stats = await this.companiesService.getSegmentationStats(placeId);
    return JSON.stringify(stats);
  }

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

    // Use o método específico que carrega todos os detalhes dos usuários e segmentação
    return this.companiesService.findOneWithUsersDetails(id);
  }

  // ===== VALIDATION QUERIES =====

  /**
   * Validar se empresa tem hierarquia completa
   * Permitido: SUPER_ADMIN, PLACE_ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Query(() => Boolean, { name: 'validateCompanySegmentation' })
  async validateCompanySegmentation(@Args('id', { type: () => Int }) id: number): Promise<boolean> {
    this.logger.debug('Validating company segmentation for ID:', id);

    try {
      const company = await this.companiesService.findOne(id);

      // Verificar se tem hierarquia completa
      const hasCompleteHierarchy = !!(
        company.segmentId &&
        company.categoryId &&
        company.subcategoryId &&
        company.segment &&
        company.category &&
        company.subcategory
      );

      this.logger.debug('Company segmentation validation result:', {
        companyId: id,
        hasCompleteHierarchy,
        segmentId: company.segmentId,
        categoryId: company.categoryId,
        subcategoryId: company.subcategoryId,
      });

      return hasCompleteHierarchy;
    } catch (error) {
      this.logger.error('Error validating company segmentation:', error.message);
      return false;
    }
  }

  /**
   * Buscar empresas por critérios de segmentação
   * Público (sem autenticação)
   */
  @Query(() => [Company], { name: 'companiesBySegmentationCriteria' })
  async findBySegmentationCriteria(
    @Args('segmentId', { type: () => Int, nullable: true }) segmentId?: number,
    @Args('categoryId', { type: () => Int, nullable: true }) categoryId?: number,
    @Args('subcategoryId', { type: () => Int, nullable: true }) subcategoryId?: number,
    @Args('placeId', { type: () => Int, nullable: true }) placeId?: number,
  ) {
    this.logger.debug('Finding companies by segmentation criteria:', {
      segmentId,
      categoryId,
      subcategoryId,
      placeId,
    });

    // Priorizar pela hierarquia mais específica
    if (subcategoryId) {
      return this.companiesService.findBySubcategory(subcategoryId);
    }

    if (categoryId) {
      return this.companiesService.findByCategory(categoryId);
    }

    if (segmentId) {
      return this.companiesService.findBySegment(segmentId);
    }

    if (placeId) {
      return this.companiesService.findByPlace(placeId);
    }

    // Se nenhum critério específico, retornar todas
    return this.companiesService.findAll();
  }

  // ===== COMPANY HIERARCHY DISPLAY =====

  /**
   * Buscar hierarquia de segmentação de uma empresa
   * Público (sem autenticação)
   */
  @Query(() => String, { name: 'companySegmentationHierarchy' })
  async getCompanySegmentationHierarchy(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<string> {
    this.logger.debug('Getting company segmentation hierarchy for ID:', id);

    try {
      const company = await this.companiesService.findOne(id);

      const hierarchy = {
        companyId: company.id,
        companyName: company.name,
        place: {
          id: company.place.id,
          name: company.place.name,
          city: company.place.city,
          state: company.place.state,
        },
        segment: company.segment
          ? {
              id: company.segment.id,
              name: company.segment.name,
              slug: company.segment.slug,
              color: company.segment.color,
            }
          : null,
        category: company.category
          ? {
              id: company.category.id,
              name: company.category.name,
              slug: company.category.slug,
              color: company.category.color,
            }
          : null,
        subcategory: company.subcategory
          ? {
              id: company.subcategory.id,
              name: company.subcategory.name,
              slug: company.subcategory.slug,
            }
          : null,
        hierarchyString:
          company.segment && company.category && company.subcategory
            ? `${company.segment.name} → ${company.category.name} → ${company.subcategory.name}`
            : 'Hierarquia incompleta',
        isComplete: !!(company.segmentId && company.categoryId && company.subcategoryId),
      };

      return JSON.stringify(hierarchy);
    } catch (error) {
      this.logger.error('Error getting company hierarchy:', error.message);
      throw error;
    }
  }
}
