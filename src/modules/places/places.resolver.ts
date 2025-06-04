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
    this.logger.debug('=== CREATE PLACE DEBUG START ===');
    this.logger.debug('Current user:', {
      id: currentUser?.id,
      email: currentUser?.email,
      userRoles:
        currentUser?.userRoles?.map(ur => ({
          id: ur.id,
          roleId: ur.roleId,
          roleName: ur.role?.name,
        })) || 'no userRoles',
    });

    this.logger.debug('CreatePlaceInput:', createPlaceInput);

    if (!currentUser) {
      this.logger.error('CurrentUser is null or undefined');
      throw new Error('User not authenticated');
    }

    try {
      const result = await this.placesService.create(createPlaceInput);
      this.logger.debug('Place created successfully:', { id: result.id, name: result.name });
      return result;
    } catch (error) {
      this.logger.error('Error creating place:', error.message);
      this.logger.error('Error stack:', error.stack);
      throw error;
    }
  }

  @Query(() => [Place], { name: 'places' })
  async findAll() {
    this.logger.debug('FindAll places called');
    try {
      const places = await this.placesService.findAll();
      this.logger.debug(`Found ${places.length} places`);
      return places;
    } catch (error) {
      this.logger.error('Error finding places:', error.message);
      throw error;
    }
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
  async findByOrganization() {
    this.logger.debug('FindByOrganization called');
    try {
      const places = await this.placesService.findByOrganization();
      this.logger.debug(`Found ${places.length} places by organization`);
      return places;
    } catch (error) {
      this.logger.error('Error finding places by organization:', error.message);
      throw error;
    }
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
