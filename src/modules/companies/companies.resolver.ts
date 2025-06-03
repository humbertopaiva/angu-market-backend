// src/modules/companies/companies.resolver.ts
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

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
  constructor(private readonly companiesService: CompaniesService) {}

  // Super admin e place admin podem criar empresas
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Mutation(() => Company)
  createCompany(
    @Args('createCompanyInput') createCompanyInput: CreateCompanyInput,
    @CurrentUser() currentUser: User,
  ) {
    return this.companiesService.create(createCompanyInput, currentUser);
  }

  @Query(() => [Company], { name: 'companies' })
  findAll() {
    return this.companiesService.findAll();
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
  @Mutation(() => Company)
  removeCompany(@Args('id', { type: () => Int }) id: number, @CurrentUser() currentUser: User) {
    return this.companiesService.remove(id, currentUser);
  }
}
