import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';
import { Segment } from './entities/segment.entity';
import { CreateSegmentInput } from './dto/create-segment.input';
import { UpdateSegmentInput } from './dto/update-segment.input';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../auth/entities/role.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SegmentsService } from './segments.service';

@Resolver(() => Segment)
export class SegmentsResolver {
  private readonly logger = new Logger(SegmentsResolver.name);

  constructor(private readonly segmentsService: SegmentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Mutation(() => Segment)
  async createSegment(
    @Args('createSegmentInput') createSegmentInput: CreateSegmentInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('=== RESOLVER: CREATE SEGMENT ===');
    this.logger.debug('Input:', createSegmentInput);
    this.logger.debug('User:', currentUser?.email);

    try {
      const result = await this.segmentsService.create(createSegmentInput, currentUser);
      this.logger.debug('Segment created successfully');
      return result;
    } catch (error) {
      this.logger.error('Error in createSegment resolver:', error);
      throw error;
    }
  }

  // QUERY PÚBLICA - SEM AUTENTICAÇÃO
  @Query(() => [Segment], { name: 'segments' })
  async findAllSegments() {
    this.logger.debug('=== RESOLVER: FIND ALL SEGMENTS ===');

    try {
      const segments = await this.segmentsService.findAll();
      this.logger.debug(`Resolver returning ${segments.length} segments`);
      return segments;
    } catch (error) {
      this.logger.error('Error in findAllSegments resolver:', error);
      throw error;
    }
  }

  @Query(() => [Segment], { name: 'segmentsByPlace' })
  async findSegmentsByPlace(@Args('placeId', { type: () => Int }) placeId: number) {
    this.logger.debug('=== RESOLVER: FIND SEGMENTS BY PLACE ===');
    this.logger.debug('PlaceId:', placeId);

    try {
      const segments = await this.segmentsService.findByPlace(placeId);
      this.logger.debug(`Resolver returning ${segments.length} segments for place ${placeId}`);
      return segments;
    } catch (error) {
      this.logger.error('Error in findSegmentsByPlace resolver:', error);
      throw error;
    }
  }

  @Query(() => Segment, { name: 'segment' })
  async findOneSegment(@Args('id', { type: () => Int }) id: number) {
    this.logger.debug('=== RESOLVER: FIND ONE SEGMENT ===');
    this.logger.debug('SegmentId:', id);

    try {
      const segment = await this.segmentsService.findOne(id);
      this.logger.debug('Segment found');
      return segment;
    } catch (error) {
      this.logger.error('Error in findOneSegment resolver:', error);
      throw error;
    }
  }

  @Query(() => Segment, { name: 'segmentBySlug' })
  async findSegmentBySlug(
    @Args('slug', { type: () => String }) slug: string,
    @Args('placeId', { type: () => Int }) placeId: number,
  ) {
    this.logger.debug('=== RESOLVER: FIND SEGMENT BY SLUG ===');
    this.logger.debug('Slug:', slug, 'PlaceId:', placeId);

    try {
      const segment = await this.segmentsService.findBySlug(slug, placeId);
      this.logger.debug('Segment found by slug');
      return segment;
    } catch (error) {
      this.logger.error('Error in findSegmentBySlug resolver:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Mutation(() => Segment)
  async updateSegment(
    @Args('updateSegmentInput') updateSegmentInput: UpdateSegmentInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('=== RESOLVER: UPDATE SEGMENT ===');
    this.logger.debug('Input:', updateSegmentInput);

    try {
      const result = await this.segmentsService.update(
        updateSegmentInput.id,
        updateSegmentInput,
        currentUser,
      );
      this.logger.debug('Segment updated successfully');
      return result;
    } catch (error) {
      this.logger.error('Error in updateSegment resolver:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Mutation(() => Segment)
  async removeSegment(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('=== RESOLVER: REMOVE SEGMENT ===');
    this.logger.debug('SegmentId:', id);

    try {
      const result = await this.segmentsService.remove(id, currentUser);
      this.logger.debug('Segment removed successfully');
      return result;
    } catch (error) {
      this.logger.error('Error in removeSegment resolver:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Mutation(() => Segment)
  async addCategoriesToSegment(
    @Args('segmentId', { type: () => Int }) segmentId: number,
    @Args('categoryIds', { type: () => [Int] }) categoryIds: number[],
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('=== RESOLVER: ADD CATEGORIES TO SEGMENT ===');

    try {
      const result = await this.segmentsService.addCategoriesToSegment(
        segmentId,
        categoryIds,
        currentUser,
      );
      this.logger.debug('Categories added to segment successfully');
      return result;
    } catch (error) {
      this.logger.error('Error in addCategoriesToSegment resolver:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Mutation(() => Segment)
  async removeCategoriesFromSegment(
    @Args('segmentId', { type: () => Int }) segmentId: number,
    @Args('categoryIds', { type: () => [Int] }) categoryIds: number[],
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('=== RESOLVER: REMOVE CATEGORIES FROM SEGMENT ===');

    try {
      const result = await this.segmentsService.removeCategoriesFromSegment(
        segmentId,
        categoryIds,
        currentUser,
      );
      this.logger.debug('Categories removed from segment successfully');
      return result;
    } catch (error) {
      this.logger.error('Error in removeCategoriesFromSegment resolver:', error);
      throw error;
    }
  }
}
