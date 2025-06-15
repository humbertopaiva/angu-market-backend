import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';

import { CompanyBasicInfoService } from './company-basic-info.service';
import { CompanyBasicInfo } from './entities/company-basic-info.entity';
import { CreateCompanyBasicInfoInput } from './dto/create-company-basic-info.input';
import { UpdateCompanyBasicInfoInput } from './dto/update-company-basic-info.input';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RoleType } from '@/modules/auth/entities/role.entity';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';

@Resolver(() => CompanyBasicInfo)
export class CompanyBasicInfoResolver {
  private readonly logger = new Logger(CompanyBasicInfoResolver.name);

  constructor(private readonly basicInfoService: CompanyBasicInfoService) {}

  /**
   * Criar informações básicas da empresa
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN, COMPANY_STAFF
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => CompanyBasicInfo)
  async createCompanyBasicInfo(
    @Args('companyId', { type: () => Int }) companyId: number,
    @Args('createBasicInfoInput') createBasicInfoInput: CreateCompanyBasicInfoInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('=== CREATE COMPANY BASIC INFO RESOLVER ===');
    this.logger.debug('CompanyId:', companyId);
    this.logger.debug('Input:', createBasicInfoInput);

    try {
      const result = await this.basicInfoService.create(
        companyId,
        createBasicInfoInput,
        currentUser,
      );
      this.logger.debug('Company basic info created successfully');
      return result;
    } catch (error) {
      this.logger.error('Error creating company basic info:', error.message);
      throw error;
    }
  }

  /**
   * Listar todas as informações básicas
   * Permitido: SUPER_ADMIN, PLACE_ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Query(() => [CompanyBasicInfo], { name: 'allCompanyBasicInfos' })
  findAll() {
    this.logger.debug('Finding all company basic infos');
    return this.basicInfoService.findAll();
  }

  /**
   * Buscar informações básicas do usuário logado
   * Requer autenticação
   */
  @UseGuards(JwtAuthGuard)
  @Query(() => [CompanyBasicInfo], { name: 'myCompanyBasicInfos' })
  findByCurrentUser(@CurrentUser() currentUser: User) {
    this.logger.debug('Finding company basic infos for current user:', {
      id: currentUser?.id,
      email: currentUser?.email,
    });
    return this.basicInfoService.findByUser(currentUser);
  }

  /**
   * Buscar informações básicas por ID
   * Público (sem autenticação) - para exibição pública dos dados básicos
   */
  @Query(() => CompanyBasicInfo, { name: 'companyBasicInfo' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    this.logger.debug('Finding company basic info by ID:', id);
    return this.basicInfoService.findOne(id);
  }

  /**
   * Buscar informações básicas por empresa
   * Público (sem autenticação) - para exibição pública dos dados básicos
   */
  @Query(() => CompanyBasicInfo, { name: 'companyBasicInfoByCompany', nullable: true })
  findByCompany(@Args('companyId', { type: () => Int }) companyId: number) {
    this.logger.debug('Finding company basic info by company:', companyId);
    return this.basicInfoService.findByCompany(companyId);
  }

  /**
   * Buscar informações básicas por place
   * Público (sem autenticação) - para listagem pública
   */
  @Query(() => [CompanyBasicInfo], { name: 'companyBasicInfosByPlace' })
  findByPlace(@Args('placeId', { type: () => Int }) placeId: number) {
    this.logger.debug('Finding company basic infos by place:', placeId);
    return this.basicInfoService.findByPlace(placeId);
  }

  /**
   * Atualizar informações básicas
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN, COMPANY_STAFF
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => CompanyBasicInfo)
  updateCompanyBasicInfo(
    @Args('updateBasicInfoInput') updateBasicInfoInput: UpdateCompanyBasicInfoInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Updating company basic info:', {
      id: updateBasicInfoInput.id,
      currentUser: currentUser?.email,
    });
    return this.basicInfoService.update(updateBasicInfoInput.id, updateBasicInfoInput, currentUser);
  }

  /**
   * Remover informações básicas
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => Boolean)
  async removeCompanyBasicInfo(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() currentUser: User,
  ): Promise<boolean> {
    this.logger.debug('Removing company basic info:', id);

    try {
      await this.basicInfoService.remove(id, currentUser);
      this.logger.debug('Company basic info removed successfully');
      return true;
    } catch (error) {
      this.logger.error('Error removing company basic info:', error.message);
      throw error;
    }
  }

  /**
   * Criar ou atualizar informações básicas (upsert)
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN, COMPANY_STAFF
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => CompanyBasicInfo)
  async upsertCompanyBasicInfo(
    @Args('companyId', { type: () => Int }) companyId: number,
    @Args('basicInfoData') basicInfoData: CreateCompanyBasicInfoInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Upserting company basic info:', { companyId });

    try {
      const result = await this.basicInfoService.upsert(companyId, basicInfoData, currentUser);
      this.logger.debug('Company basic info upserted successfully');
      return result;
    } catch (error) {
      this.logger.error('Error upserting company basic info:', error.message);
      throw error;
    }
  }
}
