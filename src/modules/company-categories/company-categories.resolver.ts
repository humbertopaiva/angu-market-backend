import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../auth/entities/role.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Category } from './entities/company-category.entity';
import { CategoriesService } from './company-categories.service';
import { CreateCategoryInput } from './dto/create-company-category.input';
import { UpdateCategoryInput } from './dto/update-company-category.input';

@Resolver(() => Category)
export class CategoriesResolver {
  constructor(private readonly categoriesService: CategoriesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.PLACE_ADMIN)
  @Mutation(() => Category)
  createCategory(
    @Args('createCategoryInput') createCategoryInput: CreateCategoryInput,
    @CurrentUser() currentUser: User,
  ) {
    return this.categoriesService.create(createCategoryInput, currentUser);
  }

  @Query(() => [Category], { name: 'categories' })
  findAllCategories() {
    return this.categoriesService.findAll();
  }

  @Query(() => [Category], { name: 'categoriesByPlace' })
  findCategoriesByPlace(@Args('placeId', { type: () => Int }) placeId: number) {
    return this.categoriesService.findByPlace(placeId);
  }

  @Query(() => Category, { name: 'category' })
  findOneCategory(@Args('id', { type: () => Int }) id: number) {
    return this.categoriesService.findOne(id);
  }

  @Query(() => Category, { name: 'categoryBySlug' })
  findCategoryBySlug(
    @Args('slug', { type: () => String }) slug: string,
    @Args('placeId', { type: () => Int }) placeId: number,
  ) {
    return this.categoriesService.findBySlug(slug, placeId);
  }

  @Query(() => [Category], { name: 'categoriesBySegment' })
  findCategoriesBySegment(@Args('segmentId', { type: () => Int }) segmentId: number) {
    return this.categoriesService.findBySegment(segmentId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.PLACE_ADMIN)
  @Mutation(() => Category)
  updateCategory(
    @Args('updateCategoryInput') updateCategoryInput: UpdateCategoryInput,
    @CurrentUser() currentUser: User,
  ) {
    return this.categoriesService.update(updateCategoryInput.id, updateCategoryInput, currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.PLACE_ADMIN)
  @Mutation(() => Category)
  removeCategory(@Args('id', { type: () => Int }) id: number, @CurrentUser() currentUser: User) {
    return this.categoriesService.remove(id, currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.PLACE_ADMIN)
  @Mutation(() => Category)
  addSegmentsToCategory(
    @Args('categoryId', { type: () => Int }) categoryId: number,
    @Args('segmentIds', { type: () => [Int] }) segmentIds: number[],
    @CurrentUser() currentUser: User,
  ) {
    return this.categoriesService.addSegmentsToCategory(categoryId, segmentIds, currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.PLACE_ADMIN)
  @Mutation(() => Category)
  removeSegmentsFromCategory(
    @Args('categoryId', { type: () => Int }) categoryId: number,
    @Args('segmentIds', { type: () => [Int] }) segmentIds: number[],
    @CurrentUser() currentUser: User,
  ) {
    return this.categoriesService.removeSegmentsFromCategory(categoryId, segmentIds, currentUser);
  }
}
