// src/modules/companies/companies.resolver.ts - COMPLETAMENTE CORRIGIDO
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';

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

  // Super admin e place admin podem criar empresas
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

  // Query principal para listagem de empresas
  @Query(() => [Company], { name: 'companies' })
  async findAll() {
    this.logger.debug('=== COMPANIES RESOLVER FIND ALL DEBUG START ===');

    try {
      const companies = await this.companiesService.findAll();
      this.logger.debug(`Resolver returning ${companies.length} companies`);

      // Log das empresas que serão retornadas
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

  // Nova query para empresas do usuário atual
  @UseGuards(JwtAuthGuard)
  @Query(() => [Company], { name: 'myCompanies' })
  findByCurrentUser(@CurrentUser() currentUser: User) {
    return this.companiesService.findByUser(currentUser);
  }

  @Query(() => Company, { name: 'company' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.companiesService.findOne(id);
  }

  @Query(() => Company, { name: 'companyBySlug' })
  findBySlug(@Args('slug', { type: () => String }) slug: string) {
    return this.companiesService.findBySlug(slug);
  }

  @Query(() => [Company], { name: 'companiesByPlace' })
  findByPlace(@Args('placeId', { type: () => Int }) placeId: number) {
    return this.companiesService.findByPlace(placeId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => Company)
  updateCompany(
    @Args('updateCompanyInput') updateCompanyInput: UpdateCompanyInput,
    @CurrentUser() currentUser: User,
  ) {
    return this.companiesService.update(updateCompanyInput.id, updateCompanyInput, currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Mutation(() => Boolean) // MUDANÇA: Era Company, agora é Boolean
  async removeCompany(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() currentUser: User,
  ): Promise<boolean> {
    // MUDANÇA: Era Promise<Company>, agora é Promise<boolean>
    this.logger.debug('=== REMOVE COMPANY RESOLVER DEBUG START ===');
    this.logger.debug('Company ID to remove:', id);

    try {
      await this.companiesService.remove(id, currentUser);
      this.logger.debug('Company removed successfully');
      this.logger.debug('=== REMOVE COMPANY RESOLVER DEBUG END ===');
      return true; // MUDANÇA: Retorna true em vez da empresa
    } catch (error) {
      this.logger.error('Error removing company:', error.message);
      throw error;
    }
  }
}
