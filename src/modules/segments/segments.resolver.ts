import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
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
  constructor(private readonly segmentsService: SegmentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.PLACE_ADMIN)
  @Mutation(() => Segment)
  createSegment(
    @Args('createSegmentInput') createSegmentInput: CreateSegmentInput,
    @CurrentUser() currentUser: User,
  ) {
    return this.segmentsService.create(createSegmentInput, currentUser);
  }

  @Query(() => [Segment], { name: 'segments' })
  findAllSegments() {
    return this.segmentsService.findAll();
  }

  @Query(() => [Segment], { name: 'segmentsByPlace' })
  findSegmentsByPlace(@Args('placeId', { type: () => Int }) placeId: number) {
    return this.segmentsService.findByPlace(placeId);
  }

  @Query(() => Segment, { name: 'segment' })
  findOneSegment(@Args('id', { type: () => Int }) id: number) {
    return this.segmentsService.findOne(id);
  }

  @Query(() => Segment, { name: 'segmentBySlug' })
  findSegmentBySlug(
    @Args('slug', { type: () => String }) slug: string,
    @Args('placeId', { type: () => Int }) placeId: number,
  ) {
    return this.segmentsService.findBySlug(slug, placeId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.PLACE_ADMIN)
  @Mutation(() => Segment)
  updateSegment(
    @Args('updateSegmentInput') updateSegmentInput: UpdateSegmentInput,
    @CurrentUser() currentUser: User,
  ) {
    return this.segmentsService.update(updateSegmentInput.id, updateSegmentInput, currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.PLACE_ADMIN)
  @Mutation(() => Segment)
  removeSegment(@Args('id', { type: () => Int }) id: number, @CurrentUser() currentUser: User) {
    return this.segmentsService.remove(id, currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.PLACE_ADMIN)
  @Mutation(() => Segment)
  addCategoriesToSegment(
    @Args('segmentId', { type: () => Int }) segmentId: number,
    @Args('categoryIds', { type: () => [Int] }) categoryIds: number[],
    @CurrentUser() currentUser: User,
  ) {
    return this.segmentsService.addCategoriesToSegment(segmentId, categoryIds, currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.PLACE_ADMIN)
  @Mutation(() => Segment)
  removeCategoriesFromSegment(
    @Args('segmentId', { type: () => Int }) segmentId: number,
    @Args('categoryIds', { type: () => [Int] }) categoryIds: number[],
    @CurrentUser() currentUser: User,
  ) {
    return this.segmentsService.removeCategoriesFromSegment(segmentId, categoryIds, currentUser);
  }
}
