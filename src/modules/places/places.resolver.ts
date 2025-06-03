// src/modules/places/places.resolver.ts
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';

import { PlacesService } from './places.service';
import { Place } from './entities/place.entity';
import { CreatePlaceInput } from './dto/create-place.input';
import { UpdatePlaceInput } from './dto/update-place.input';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../auth/entities/role.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Resolver(() => Place)
export class PlacesResolver {
  private readonly logger = new Logger(PlacesResolver.name);

  constructor(private readonly placesService: PlacesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN)
  @Mutation(() => Place)
  async createPlace(
    @Args('createPlaceInput') createPlaceInput: CreatePlaceInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('CreatePlace mutation called by user:', {
      userId: currentUser?.id,
      email: currentUser?.email,
      roles: currentUser?.userRoles?.map(ur => ur.role?.name) || [],
    });

    if (!currentUser) {
      this.logger.error('CurrentUser is null or undefined');
      throw new Error('User not authenticated');
    }

    this.logger.debug('Creating place with input:', createPlaceInput);

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

  @Query(() => [Place], { name: 'placesByOrganization' })
  findByOrganization() {
    return this.placesService.findByOrganization();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN)
  @Mutation(() => Place)
  updatePlace(@Args('updatePlaceInput') updatePlaceInput: UpdatePlaceInput) {
    return this.placesService.update(updatePlaceInput.id, updatePlaceInput);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN)
  @Mutation(() => Place)
  removePlace(@Args('id', { type: () => Int }) id: number) {
    return this.placesService.remove(id);
  }
}
