// src/modules/places/places.resolver.ts
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { PlacesService } from './places.service';
import { Place } from './entities/place.entity';
import { CreatePlaceInput } from './dto/create-place.input';
import { UpdatePlaceInput } from './dto/update-place.input';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../auth/entities/role.entity';

@Resolver(() => Place)
export class PlacesResolver {
  constructor(private readonly placesService: PlacesService) {}

  // Apenas super admin pode criar places
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN)
  @Mutation(() => Place)
  createPlace(@Args('createPlaceInput') createPlaceInput: CreatePlaceInput) {
    return this.placesService.create(createPlaceInput);
  }

  @Query(() => [Place], { name: 'places' })
  findAll() {
    return this.placesService.findAll();
  }

  @Query(() => Place, { name: 'place' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.placesService.findOne(id);
  }

  @Query(() => Place, { name: 'placeBySlug' })
  findBySlug(@Args('slug', { type: () => String }) slug: string) {
    return this.placesService.findBySlug(slug);
  }

  // Atualizada para não precisar de organizationId
  @Query(() => [Place], { name: 'placesByOrganization' })
  findByOrganization() {
    return this.placesService.findByOrganization();
  }

  // Apenas super admin pode atualizar places
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN)
  @Mutation(() => Place)
  updatePlace(@Args('updatePlaceInput') updatePlaceInput: UpdatePlaceInput) {
    return this.placesService.update(updatePlaceInput.id, updatePlaceInput);
  }

  // Apenas super admin pode remover places
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN)
  @Mutation(() => Place)
  removePlace(@Args('id', { type: () => Int }) id: number) {
    return this.placesService.remove(id);
  }
}
