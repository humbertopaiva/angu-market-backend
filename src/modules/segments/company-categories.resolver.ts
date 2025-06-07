// src/modules/segments/company-categories.resolver.ts - CORRIGIDO
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(CategoriesResolver.name);

  constructor(private readonly categoriesService: CategoriesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Mutation(() => Category)
  createCategory(
    @Args('createCategoryInput') createCategoryInput: CreateCategoryInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Creating category:', createCategoryInput);
    return this.categoriesService.create(createCategoryInput, currentUser);
  }

  // CORREÇÃO: Query pública para listar categorias
  @Query(() => [Category], { name: 'categories' })
  findAllCategories() {
    this.logger.debug('Finding all categories');
    return this.categoriesService.findAll();
  }

  @Query(() => [Category], { name: 'categoriesByPlace' })
  findCategoriesByPlace(@Args('placeId', { type: () => Int }) placeId: number) {
    this.logger.debug('Finding categories by place:', placeId);
    return this.categoriesService.findByPlace(placeId);
  }

  @Query(() => Category, { name: 'category' })
  findOneCategory(@Args('id', { type: () => Int }) id: number) {
    this.logger.debug('Finding category by id:', id);
    return this.categoriesService.findOne(id);
  }

  @Query(() => Category, { name: 'categoryBySlug' })
  findCategoryBySlug(
    @Args('slug', { type: () => String }) slug: string,
    @Args('placeId', { type: () => Int }) placeId: number,
  ) {
    this.logger.debug('Finding category by slug:', { slug, placeId });
    return this.categoriesService.findBySlug(slug, placeId);
  }

  @Query(() => [Category], { name: 'categoriesBySegment' })
  findCategoriesBySegment(@Args('segmentId', { type: () => Int }) segmentId: number) {
    this.logger.debug('Finding categories by segment:', segmentId);
    return this.categoriesService.findBySegment(segmentId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Mutation(() => Category)
  updateCategory(
    @Args('updateCategoryInput') updateCategoryInput: UpdateCategoryInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Updating category:', updateCategoryInput);
    return this.categoriesService.update(updateCategoryInput.id, updateCategoryInput, currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Mutation(() => Category)
  removeCategory(@Args('id', { type: () => Int }) id: number, @CurrentUser() currentUser: User) {
    this.logger.debug('Removing category:', id);
    return this.categoriesService.remove(id, currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Mutation(() => Category)
  addSegmentsToCategory(
    @Args('categoryId', { type: () => Int }) categoryId: number,
    @Args('segmentIds', { type: () => [Int] }) segmentIds: number[],
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Adding segments to category:', { categoryId, segmentIds });
    return this.categoriesService.addSegmentsToCategory(categoryId, segmentIds, currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Mutation(() => Category)
  removeSegmentsFromCategory(
    @Args('categoryId', { type: () => Int }) categoryId: number,
    @Args('segmentIds', { type: () => [Int] }) segmentIds: number[],
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Removing segments from category:', { categoryId, segmentIds });
    return this.categoriesService.removeSegmentsFromCategory(categoryId, segmentIds, currentUser);
  }
}
