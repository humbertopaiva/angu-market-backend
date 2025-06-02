import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleType } from '../auth/entities/role.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Subcategory } from './entities/company-subcategory.entity';
import { SubcategoriesService } from './company-subcategories.service';
import { CreateSubcategoryInput } from './dto/create-company-subcategory.input';
import { UpdateSubcategoryInput } from './dto/update-company-subcategory.input';

@Resolver(() => Subcategory)
export class SubcategoriesResolver {
  constructor(private readonly subcategoriesService: SubcategoriesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.PLACE_ADMIN)
  @Mutation(() => Subcategory)
  createSubcategory(
    @Args('createSubcategoryInput') createSubcategoryInput: CreateSubcategoryInput,
    @CurrentUser() currentUser: User,
  ) {
    return this.subcategoriesService.create(createSubcategoryInput, currentUser);
  }

  @Query(() => [Subcategory], { name: 'subcategories' })
  findAllSubcategories() {
    return this.subcategoriesService.findAll();
  }

  @Query(() => [Subcategory], { name: 'subcategoriesByPlace' })
  findSubcategoriesByPlace(@Args('placeId', { type: () => Int }) placeId: number) {
    return this.subcategoriesService.findByPlace(placeId);
  }

  @Query(() => Subcategory, { name: 'subcategory' })
  findOneSubcategory(@Args('id', { type: () => Int }) id: number) {
    return this.subcategoriesService.findOne(id);
  }

  @Query(() => Subcategory, { name: 'subcategoryBySlug' })
  findSubcategoryBySlug(
    @Args('slug', { type: () => String }) slug: string,
    @Args('placeId', { type: () => Int }) placeId: number,
  ) {
    return this.subcategoriesService.findBySlug(slug, placeId);
  }

  @Query(() => [Subcategory], { name: 'subcategoriesByCategory' })
  findSubcategoriesByCategory(@Args('categoryId', { type: () => Int }) categoryId: number) {
    return this.subcategoriesService.findByCategory(categoryId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.PLACE_ADMIN)
  @Mutation(() => Subcategory)
  updateSubcategory(
    @Args('updateSubcategoryInput') updateSubcategoryInput: UpdateSubcategoryInput,
    @CurrentUser() currentUser: User,
  ) {
    return this.subcategoriesService.update(
      updateSubcategoryInput.id,
      updateSubcategoryInput,
      currentUser,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.PLACE_ADMIN)
  @Mutation(() => Subcategory)
  removeSubcategory(@Args('id', { type: () => Int }) id: number, @CurrentUser() currentUser: User) {
    return this.subcategoriesService.remove(id, currentUser);
  }
}
