import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Place } from '../places/entities/place.entity';
import { User } from '../users/entities/user.entity';
import { Subcategory } from './entities/company-subcategory.entity';
import { Category } from '../company-categories/entities/company-category.entity';
import { CreateSubcategoryInput } from './dto/create-company-subcategory.input';
import { UpdateSubcategoryInput } from './dto/update-company-subcategory.input';

@Injectable()
export class SubcategoriesService {
  constructor(
    @InjectRepository(Subcategory)
    private subcategoryRepository: Repository<Subcategory>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Place)
    private placeRepository: Repository<Place>,
  ) {}

  private validatePlaceAccess(placeId: number, user: User): void {
    if (user.placeId !== placeId) {
      throw new ForbiddenException('Você não tem permissão para gerenciar este place');
    }
  }

  async create(
    createSubcategoryInput: CreateSubcategoryInput,
    currentUser: User,
  ): Promise<Subcategory> {
    const { slug, placeId, categoryId, ...subcategoryData } = createSubcategoryInput;

    this.validatePlaceAccess(placeId, currentUser);

    const place = await this.placeRepository.findOne({ where: { id: placeId } });
    if (!place) {
      throw new BadRequestException(`Place com ID ${placeId} não encontrado`);
    }

    const existingSubcategory = await this.subcategoryRepository.findOne({
      where: { slug, placeId },
    });
    if (existingSubcategory) {
      throw new BadRequestException(`Já existe uma subcategoria com o slug: ${slug} neste place`);
    }

    const category = await this.categoryRepository.findOne({
      where: { id: categoryId, placeId },
    });
    if (!category) {
      throw new BadRequestException(`Categoria com ID ${categoryId} não encontrada neste place`);
    }

    const subcategory = this.subcategoryRepository.create({
      ...subcategoryData,
      slug,
      placeId,
      categoryId,
    });

    return this.subcategoryRepository.save(subcategory);
  }

  async findAll(): Promise<Subcategory[]> {
    return this.subcategoryRepository.find({
      relations: ['place', 'category', 'category.segments'],
      order: { placeId: 'ASC', order: 'ASC', name: 'ASC' },
    });
  }

  async findByPlace(placeId: number): Promise<Subcategory[]> {
    return this.subcategoryRepository.find({
      where: { placeId },
      relations: ['category', 'category.segments'],
      order: { order: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Subcategory> {
    const subcategory = await this.subcategoryRepository.findOne({
      where: { id },
      relations: ['place', 'category', 'category.segments', 'companies'],
    });

    if (!subcategory) {
      throw new NotFoundException(`Subcategoria com ID ${id} não encontrada`);
    }

    return subcategory;
  }

  async findBySlug(slug: string, placeId: number): Promise<Subcategory> {
    const subcategory = await this.subcategoryRepository.findOne({
      where: { slug, placeId },
      relations: ['place', 'category', 'category.segments', 'companies'],
    });

    if (!subcategory) {
      throw new NotFoundException(`Subcategoria com slug ${slug} não encontrada neste place`);
    }

    return subcategory;
  }

  async findByCategory(categoryId: number): Promise<Subcategory[]> {
    return this.subcategoryRepository.find({
      where: { categoryId },
      relations: ['place', 'category'],
      order: { order: 'ASC', name: 'ASC' },
    });
  }

  async update(
    id: number,
    updateSubcategoryInput: UpdateSubcategoryInput,
    currentUser: User,
  ): Promise<Subcategory> {
    const { slug, placeId, categoryId, ...subcategoryData } = updateSubcategoryInput;

    const subcategory = await this.findOne(id);

    this.validatePlaceAccess(subcategory.placeId, currentUser);

    if (placeId && placeId !== subcategory.placeId) {
      this.validatePlaceAccess(placeId, currentUser);
    }

    if (slug && slug !== subcategory.slug) {
      const existingSubcategory = await this.subcategoryRepository.findOne({
        where: { slug, placeId: placeId || subcategory.placeId },
      });

      if (existingSubcategory && existingSubcategory.id !== id) {
        throw new BadRequestException(`Já existe uma subcategoria com o slug: ${slug} neste place`);
      }
    }

    if (categoryId && categoryId !== subcategory.categoryId) {
      const finalPlaceId = placeId || subcategory.placeId;
      const category = await this.categoryRepository.findOne({
        where: { id: categoryId, placeId: finalPlaceId },
      });

      if (!category) {
        throw new BadRequestException(`Categoria com ID ${categoryId} não encontrada neste place`);
      }
    }

    await this.subcategoryRepository.update(id, {
      ...subcategoryData,
      ...(slug && { slug }),
      ...(placeId && { placeId }),
      ...(categoryId && { categoryId }),
    });

    return this.findOne(id);
  }

  async remove(id: number, currentUser: User): Promise<Subcategory> {
    const subcategory = await this.findOne(id);

    this.validatePlaceAccess(subcategory.placeId, currentUser);

    if (subcategory.companies && subcategory.companies.length > 0) {
      throw new BadRequestException(
        'Não é possível excluir uma subcategoria que possui empresas associadas. Reassocie as empresas primeiro.',
      );
    }

    await this.subcategoryRepository.remove(subcategory);
    return subcategory;
  }

  async getSubcategoriesWithCompanyCount(
    placeId?: number,
  ): Promise<Array<Subcategory & { companyCount: number }>> {
    let query = this.subcategoryRepository
      .createQueryBuilder('subcategory')
      .leftJoinAndSelect('subcategory.place', 'place')
      .leftJoinAndSelect('subcategory.category', 'category')
      .leftJoin('subcategory.companies', 'company')
      .addSelect('COUNT(company.id)', 'companyCount')
      .groupBy('subcategory.id')
      .addGroupBy('place.id')
      .addGroupBy('category.id')
      .orderBy('subcategory.order', 'ASC')
      .addOrderBy('subcategory.name', 'ASC');

    if (placeId) {
      query = query.where('subcategory.placeId = :placeId', { placeId });
    }

    const subcategoriesWithCount = await query.getRawAndEntities();

    return subcategoriesWithCount.entities.map((subcategory, index) => {
      (subcategory as any).companyCount =
        parseInt(subcategoriesWithCount.raw[index].companyCount) || 0;
      return subcategory as Subcategory & { companyCount: number };
    });
  }
}
