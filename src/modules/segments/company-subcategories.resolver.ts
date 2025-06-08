// src/modules/segments/company-subcategories.resolver.ts - CORRIGIDO
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../auth/entities/role.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Subcategory } from './entities/company-subcategory.entity';
import { CreateSubcategoryInput } from './dto/create-company-subcategory.input';
import { UpdateSubcategoryInput } from './dto/update-company-subcategory.input';
import { SubcategoriesService } from './company-subcategories.service';

@Resolver(() => Subcategory)
export class SubcategoriesResolver {
  private readonly logger = new Logger(SubcategoriesResolver.name);

  constructor(private readonly subcategoriesService: SubcategoriesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Mutation(() => Subcategory)
  createSubcategory(
    @Args('createSubcategoryInput') createSubcategoryInput: CreateSubcategoryInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Creating subcategory:', createSubcategoryInput);
    return this.subcategoriesService.create(createSubcategoryInput, currentUser);
  }

  @Query(() => [Subcategory], { name: 'subcategories' })
  findAllSubcategories() {
    this.logger.debug('Finding all subcategories');
    return this.subcategoriesService.findAll();
  }

  @Query(() => [Subcategory], { name: 'subcategoriesByPlace' })
  findSubcategoriesByPlace(@Args('placeId', { type: () => Int }) placeId: number) {
    this.logger.debug('Finding subcategories by place:', placeId);
    return this.subcategoriesService.findByPlace(placeId);
  }

  @Query(() => Subcategory, { name: 'subcategory' })
  findOneSubcategory(@Args('id', { type: () => Int }) id: number) {
    this.logger.debug('Finding subcategory by id:', id);
    return this.subcategoriesService.findOne(id);
  }

  @Query(() => Subcategory, { name: 'subcategoryBySlug' })
  findSubcategoryBySlug(
    @Args('slug', { type: () => String }) slug: string,
    @Args('placeId', { type: () => Int }) placeId: number,
  ) {
    this.logger.debug('Finding subcategory by slug:', { slug, placeId });
    return this.subcategoriesService.findBySlug(slug, placeId);
  }

  // CORREÇÃO: Adicionar query para buscar subcategorias por categoria
  @Query(() => [Subcategory], { name: 'subcategoriesByCategory' })
  findSubcategoriesByCategory(@Args('categoryId', { type: () => Int }) categoryId: number) {
    this.logger.debug('Finding subcategories by category:', categoryId);
    return this.subcategoriesService.findByCategory(categoryId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Mutation(() => Subcategory)
  updateSubcategory(
    @Args('updateSubcategoryInput') updateSubcategoryInput: UpdateSubcategoryInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Updating subcategory:', updateSubcategoryInput);
    return this.subcategoriesService.update(
      updateSubcategoryInput.id,
      updateSubcategoryInput,
      currentUser,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Mutation(() => Subcategory)
  removeSubcategory(@Args('id', { type: () => Int }) id: number, @CurrentUser() currentUser: User) {
    this.logger.debug('Removing subcategory:', id);
    return this.subcategoriesService.remove(id, currentUser);
  }

  // ADICIONAR: Query para estatísticas de subcategorias com contagem de empresas
  @Query(() => [Subcategory], { name: 'subcategoriesWithCompanyCount' })
  getSubcategoriesWithCompanyCount(
    @Args('placeId', { type: () => Int, nullable: true }) placeId?: number,
  ) {
    this.logger.debug('Getting subcategories with company count');
    return this.subcategoriesService.getSubcategoriesWithCompanyCount(placeId);
  }
}
