// src/modules/organizations/organizations.resolver.ts
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { OrganizationsService } from './organizations.service';
import { Organization } from './entities/organization.entity';
import { UpdateOrganizationInput } from './dto/update-organization.input';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../auth/entities/role.entity';

@Resolver(() => Organization)
export class OrganizationsResolver {
  constructor(private readonly organizationsService: OrganizationsService) {}

  // Apenas SUPER_ADMIN pode atualizar a organização principal
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN)
  @Mutation(() => Organization)
  updateMainOrganization(
    @Args('updateOrganizationInput') updateOrganizationInput: Omit<UpdateOrganizationInput, 'id'>,
  ) {
    return this.organizationsService.updateMain(updateOrganizationInput);
  }

  @Query(() => Organization, { name: 'mainOrganization' })
  findMainOrganization() {
    return this.organizationsService.findMain();
  }

  // Manter queries antigas para compatibilidade (apenas leitura)
  @Query(() => [Organization], { name: 'organizations' })
  findAll() {
    return this.organizationsService.findAll();
  }

  @Query(() => Organization, { name: 'organization' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.organizationsService.findOne(id);
  }

  @Query(() => Organization, { name: 'organizationBySlug' })
  findBySlug(@Args('slug', { type: () => String }) slug: string) {
    return this.organizationsService.findBySlug(slug);
  }
}
