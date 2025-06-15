import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';

import { CompanySocialsService } from './company-socials.service';
import { CompanySocials } from './entities/company-socials.entity';
import { CompanySocial } from './entities/company-social.entity';
import { CreateCompanySocialsInput } from './dto/create-company-socials.input';
import { UpdateCompanySocialsInput } from './dto/update-company-socials.input';
import { CreateCompanySocialInput } from './dto/create-company-social.input';
import { UpdateCompanySocialInput } from './dto/update-company-social.input';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RoleType } from '@/modules/auth/entities/role.entity';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';
import { SocialNetworkType } from './enums/social-network.enum';

@Resolver(() => CompanySocials)
export class CompanySocialsResolver {
  private readonly logger = new Logger(CompanySocialsResolver.name);

  constructor(private readonly socialsService: CompanySocialsService) {}

  // ===== COMPANY SOCIALS (AGREGADOR) =====

  /**
   * Criar configurações de redes sociais da empresa
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN, COMPANY_STAFF
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => CompanySocials)
  async createCompanySocials(
    @Args('companyId', { type: () => Int }) companyId: number,
    @Args('createSocialsInput') createSocialsInput: CreateCompanySocialsInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('=== CREATE COMPANY SOCIALS RESOLVER ===');
    this.logger.debug('CompanyId:', companyId);
    this.logger.debug('Input:', createSocialsInput);

    try {
      const result = await this.socialsService.create(companyId, createSocialsInput, currentUser);
      this.logger.debug('Company socials created successfully');
      return result;
    } catch (error) {
      this.logger.error('Error creating company socials:', error.message);
      throw error;
    }
  }

  /**
   * Listar todas as configurações de redes sociais
   * Permitido: SUPER_ADMIN, PLACE_ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Query(() => [CompanySocials], { name: 'allCompanySocials' })
  findAll() {
    this.logger.debug('Finding all company socials');
    return this.socialsService.findAll();
  }

  /**
   * Buscar configurações de redes sociais do usuário logado
   * Requer autenticação
   */
  @UseGuards(JwtAuthGuard)
  @Query(() => [CompanySocials], { name: 'myCompanySocials' })
  findByCurrentUser(@CurrentUser() currentUser: User) {
    this.logger.debug('Finding company socials for current user:', {
      id: currentUser?.id,
      email: currentUser?.email,
    });
    return this.socialsService.findByUser(currentUser);
  }

  /**
   * Buscar configurações de redes sociais por ID
   * Público (sem autenticação) - para exibição pública
   */
  @Query(() => CompanySocials, { name: 'companySocials' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    this.logger.debug('Finding company socials by ID:', id);
    return this.socialsService.findOne(id);
  }

  /**
   * Buscar configurações de redes sociais por empresa
   * Público (sem autenticação) - para exibição pública
   */
  @Query(() => CompanySocials, { name: 'companySocialsByCompany', nullable: true })
  findByCompany(@Args('companyId', { type: () => Int }) companyId: number) {
    this.logger.debug('Finding company socials by company:', companyId);
    return this.socialsService.findByCompany(companyId);
  }

  /**
   * Buscar configurações de redes sociais por place
   * Público (sem autenticação) - para listagem pública
   */
  @Query(() => [CompanySocials], { name: 'companySocialsByPlace' })
  findByPlace(@Args('placeId', { type: () => Int }) placeId: number) {
    this.logger.debug('Finding company socials by place:', placeId);
    return this.socialsService.findByPlace(placeId);
  }

  /**
   * Atualizar configurações de redes sociais
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN, COMPANY_STAFF
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => CompanySocials)
  updateCompanySocials(
    @Args('updateSocialsInput') updateSocialsInput: UpdateCompanySocialsInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Updating company socials:', {
      id: updateSocialsInput.id,
      currentUser: currentUser?.email,
    });
    return this.socialsService.update(updateSocialsInput.id, updateSocialsInput, currentUser);
  }

  /**
   * Remover configurações de redes sociais
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => Boolean)
  async removeCompanySocials(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() currentUser: User,
  ): Promise<boolean> {
    this.logger.debug('Removing company socials:', id);

    try {
      await this.socialsService.remove(id, currentUser);
      this.logger.debug('Company socials removed successfully');
      return true;
    } catch (error) {
      this.logger.error('Error removing company socials:', error.message);
      throw error;
    }
  }

  /**
   * Criar ou atualizar configurações de redes sociais (upsert)
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN, COMPANY_STAFF
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => CompanySocials)
  async upsertCompanySocials(
    @Args('companyId', { type: () => Int }) companyId: number,
    @Args('socialsData') socialsData: CreateCompanySocialsInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Upserting company socials:', { companyId });

    try {
      const result = await this.socialsService.upsert(companyId, socialsData, currentUser);
      this.logger.debug('Company socials upserted successfully');
      return result;
    } catch (error) {
      this.logger.error('Error upserting company socials:', error.message);
      throw error;
    }
  }

  // ===== REDES SOCIAIS INDIVIDUAIS =====

  /**
   * Adicionar uma rede social individual
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN, COMPANY_STAFF
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => CompanySocial)
  async addSocialNetwork(
    @Args('companyId', { type: () => Int }) companyId: number,
    @Args('socialData') socialData: CreateCompanySocialInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Adding social network:', { companyId, networkType: socialData.networkType });

    try {
      const result = await this.socialsService.addSocialNetwork(companyId, socialData, currentUser);
      this.logger.debug('Social network added successfully');
      return result;
    } catch (error) {
      this.logger.error('Error adding social network:', error.message);
      throw error;
    }
  }

  /**
   * Atualizar uma rede social individual
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN, COMPANY_STAFF
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => CompanySocial)
  updateSocialNetwork(
    @Args('updateSocialInput') updateSocialInput: UpdateCompanySocialInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Updating social network:', {
      id: updateSocialInput.id,
      currentUser: currentUser?.email,
    });
    return this.socialsService.updateSocialNetwork(
      updateSocialInput.id,
      updateSocialInput,
      currentUser,
    );
  }

  /**
   * Remover uma rede social individual
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN, COMPANY_STAFF
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => Boolean)
  async removeSocialNetwork(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() currentUser: User,
  ): Promise<boolean> {
    this.logger.debug('Removing social network:', id);

    try {
      await this.socialsService.removeSocialNetwork(id, currentUser);
      this.logger.debug('Social network removed successfully');
      return true;
    } catch (error) {
      this.logger.error('Error removing social network:', error.message);
      throw error;
    }
  }

  // ===== QUERIES PÚBLICAS =====

  /**
   * Buscar empresas por rede social específica
   * Público (sem autenticação) - para filtros e busca
   */
  @Query(() => [CompanySocial], { name: 'companiesBySocialNetwork' })
  findBySocialNetwork(
    @Args('networkType', { type: () => SocialNetworkType }) networkType: SocialNetworkType,
  ) {
    this.logger.debug('Finding companies by social network:', networkType);
    return this.socialsService.findBySocialNetwork(networkType);
  }

  /**
   * Buscar redes sociais mais populares (por seguidores)
   * Público (sem autenticação) - para rankings e destaques
   */
  @Query(() => [CompanySocial], { name: 'popularSocials' })
  findPopularSocials(
    @Args('placeId', { type: () => Int, nullable: true }) placeId?: number,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ) {
    this.logger.debug('Finding popular socials:', { placeId, limit });
    return this.socialsService.findPopularSocials(placeId, limit || 10);
  }

  /**
   * Buscar redes sociais verificadas/primárias
   * Público (sem autenticação) - para empresas em destaque
   */
  @Query(() => [CompanySocial], { name: 'verifiedSocials' })
  findVerifiedSocials(@Args('placeId', { type: () => Int, nullable: true }) placeId?: number) {
    this.logger.debug('Finding verified socials:', { placeId });
    return this.socialsService.findVerifiedSocials(placeId);
  }

  // ===== FUNCIONALIDADES ADMINISTRATIVAS =====

  /**
   * Atualizar métricas de uma rede social (seguidores, etc.)
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN, COMPANY_STAFF
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => CompanySocial)
  async updateSocialMetrics(
    @Args('id', { type: () => Int }) id: number,
    @Args('followersCount', { type: () => Int }) followersCount: number,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Updating social metrics:', { id, followersCount });

    try {
      const result = await this.socialsService.updateSocialMetrics(id, followersCount, currentUser);
      this.logger.debug('Social metrics updated successfully');
      return result;
    } catch (error) {
      this.logger.error('Error updating social metrics:', error.message);
      throw error;
    }
  }
}
