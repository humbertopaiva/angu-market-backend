import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Place } from '../places/entities/place.entity';
import { User } from '../users/entities/user.entity';
import { Subcategory } from './entities/company-subcategory.entity';
import { Category } from './entities/company-category.entity';
import { CreateSubcategoryInput } from './dto/create-company-subcategory.input';
import { UpdateSubcategoryInput } from './dto/update-company-subcategory.input';
import { RoleType } from '../auth/entities/role.entity';

@Injectable()
export class SubcategoriesService {
  private readonly logger = new Logger(SubcategoriesService.name);

  constructor(
    @InjectRepository(Subcategory)
    private subcategoryRepository: Repository<Subcategory>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Place)
    private placeRepository: Repository<Place>,
  ) {}

  private validatePlaceAccess(placeId: number, user: User): void {
    this.logger.debug('=== VALIDATE PLACE ACCESS ===');
    this.logger.debug('PlaceId:', placeId);
    this.logger.debug('User placeId:', user?.placeId);

    const userRoles = user.userRoles?.map(ur => ur.role.name) || [];
    this.logger.debug('User roles:', userRoles);

    // Super admin pode acessar qualquer place
    if (userRoles.includes(RoleType.SUPER_ADMIN)) {
      this.logger.debug('User is SUPER_ADMIN, access granted');
      return;
    }

    // Place admin só pode gerenciar subcategorias de seu place
    if (userRoles.includes(RoleType.PLACE_ADMIN)) {
      if (user.placeId !== placeId) {
        throw new ForbiddenException('Você não tem permissão para gerenciar este place');
      }
      return;
    }

    throw new ForbiddenException('Você não tem permissão para gerenciar subcategorias');
  }

  async create(
    createSubcategoryInput: CreateSubcategoryInput,
    currentUser: User,
  ): Promise<Subcategory> {
    this.logger.debug('=== CREATE SUBCATEGORY ===');
    this.logger.debug('Input:', createSubcategoryInput);

    const { slug, placeId, categoryId, ...subcategoryData } = createSubcategoryInput;

    try {
      this.validatePlaceAccess(placeId, currentUser);

      // Verificar se o place existe
      const place = await this.placeRepository.findOne({ where: { id: placeId } });
      if (!place) {
        throw new BadRequestException(`Place com ID ${placeId} não encontrado`);
      }

      // Verificar se a categoria existe e pertence ao mesmo place
      const category = await this.categoryRepository.findOne({
        where: { id: categoryId, placeId },
      });
      if (!category) {
        throw new BadRequestException(`Categoria com ID ${categoryId} não encontrada neste place`);
      }

      // Verificar se já existe uma subcategoria com o mesmo slug no place
      const existingSubcategory = await this.subcategoryRepository.findOne({
        where: { slug, placeId },
      });
      if (existingSubcategory) {
        throw new BadRequestException(`Já existe uma subcategoria com o slug: ${slug} neste place`);
      }

      // Criar a subcategoria
      const subcategory = this.subcategoryRepository.create({
        ...subcategoryData,
        slug,
        placeId,
        categoryId,
      });

      const savedSubcategory = await this.subcategoryRepository.save(subcategory);
      this.logger.debug('Subcategory created:', savedSubcategory);

      return this.findOne(savedSubcategory.id);
    } catch (error) {
      this.logger.error('Error creating subcategory:', error);
      throw error;
    }
  }

  async findAll(): Promise<Subcategory[]> {
    this.logger.debug('=== FIND ALL SUBCATEGORIES ===');

    try {
      const subcategories = await this.subcategoryRepository.find({
        relations: {
          place: true,
          category: {
            segments: true,
          },
          companies: true,
        },
        order: {
          placeId: 'ASC',
          categoryId: 'ASC',
          order: 'ASC',
          name: 'ASC',
        },
      });

      this.logger.debug(`Found ${subcategories.length} subcategories`);

      // Log detalhado para debug
      subcategories.forEach((subcategory, index) => {
        this.logger.debug(`Subcategory ${index + 1}:`, {
          id: subcategory.id,
          name: subcategory.name,
          slug: subcategory.slug,
          placeId: subcategory.placeId,
          categoryId: subcategory.categoryId,
          placeName: subcategory.place?.name || 'No place loaded',
          categoryName: subcategory.category?.name || 'No category loaded',
          companiesCount: subcategory.companies?.length || 0,
          isActive: subcategory.isActive,
        });
      });

      return subcategories;
    } catch (error) {
      this.logger.error('Error in findAll:', error);
      throw error;
    }
  }

  async findByPlace(placeId: number): Promise<Subcategory[]> {
    this.logger.debug('=== FIND SUBCATEGORIES BY PLACE ===');
    this.logger.debug('PlaceId:', placeId);

    try {
      const subcategories = await this.subcategoryRepository.find({
        where: { placeId },
        relations: {
          place: true,
          category: {
            segments: true,
          },
          companies: true,
        },
        order: {
          categoryId: 'ASC',
          order: 'ASC',
          name: 'ASC',
        },
      });

      this.logger.debug(`Found ${subcategories.length} subcategories for place ${placeId}`);
      return subcategories;
    } catch (error) {
      this.logger.error('Error in findByPlace:', error);
      throw error;
    }
  }

  async findByCategory(categoryId: number): Promise<Subcategory[]> {
    this.logger.debug('=== FIND SUBCATEGORIES BY CATEGORY ===');
    this.logger.debug('CategoryId:', categoryId);

    try {
      const subcategories = await this.subcategoryRepository.find({
        where: { categoryId },
        relations: {
          place: true,
          category: {
            segments: true,
          },
          companies: true,
        },
        order: {
          order: 'ASC',
          name: 'ASC',
        },
      });

      this.logger.debug(`Found ${subcategories.length} subcategories for category ${categoryId}`);
      return subcategories;
    } catch (error) {
      this.logger.error('Error in findByCategory:', error);
      throw error;
    }
  }

  async findOne(id: number): Promise<Subcategory> {
    this.logger.debug('=== FIND ONE SUBCATEGORY ===');
    this.logger.debug('SubcategoryId:', id);

    try {
      const subcategory = await this.subcategoryRepository.findOne({
        where: { id },
        relations: {
          place: true,
          category: {
            segments: true,
          },
          companies: true,
        },
      });

      if (!subcategory) {
        throw new NotFoundException(`Subcategoria com ID ${id} não encontrada`);
      }

      this.logger.debug('Subcategory found:', {
        id: subcategory.id,
        name: subcategory.name,
        placeId: subcategory.placeId,
        categoryId: subcategory.categoryId,
      });

      return subcategory;
    } catch (error) {
      this.logger.error('Error in findOne:', error);
      throw error;
    }
  }

  async findBySlug(slug: string, placeId: number): Promise<Subcategory> {
    this.logger.debug('=== FIND SUBCATEGORY BY SLUG ===');
    this.logger.debug('Slug:', slug, 'PlaceId:', placeId);

    try {
      const subcategory = await this.subcategoryRepository.findOne({
        where: { slug, placeId },
        relations: {
          place: true,
          category: {
            segments: true,
          },
          companies: true,
        },
      });

      if (!subcategory) {
        throw new NotFoundException(`Subcategoria com slug ${slug} não encontrada neste place`);
      }

      return subcategory;
    } catch (error) {
      this.logger.error('Error in findBySlug:', error);
      throw error;
    }
  }

  async update(
    id: number,
    updateSubcategoryInput: UpdateSubcategoryInput,
    currentUser: User,
  ): Promise<Subcategory> {
    this.logger.debug('=== UPDATE SUBCATEGORY ===');
    this.logger.debug('SubcategoryId:', id, 'Input:', updateSubcategoryInput);

    const { slug, placeId, categoryId, ...subcategoryData } = updateSubcategoryInput;

    try {
      // Verifica se a subcategoria existe
      const subcategory = await this.findOne(id);

      // Validar acesso ao place
      this.validatePlaceAccess(subcategory.placeId, currentUser);

      // Se está atualizando o place, validar acesso ao novo place também
      if (placeId && placeId !== subcategory.placeId) {
        this.validatePlaceAccess(placeId, currentUser);
      }

      // Se está atualizando o slug, verifica se já existe outra subcategoria com o mesmo slug no place
      if (slug && slug !== subcategory.slug) {
        const existingSubcategory = await this.subcategoryRepository.findOne({
          where: { slug, placeId: placeId || subcategory.placeId },
        });

        if (existingSubcategory && existingSubcategory.id !== id) {
          throw new BadRequestException(
            `Já existe uma subcategoria com o slug: ${slug} neste place`,
          );
        }
      }

      // Se está atualizando a categoria, verificar se ela existe no place correto
      if (categoryId && categoryId !== subcategory.categoryId) {
        const finalPlaceId = placeId || subcategory.placeId;
        const category = await this.categoryRepository.findOne({
          where: { id: categoryId, placeId: finalPlaceId },
        });

        if (!category) {
          throw new BadRequestException(
            `Categoria com ID ${categoryId} não encontrada neste place`,
          );
        }
      }

      // Atualiza os dados
      await this.subcategoryRepository.update(id, {
        ...subcategoryData,
        ...(slug && { slug }),
        ...(placeId && { placeId }),
        ...(categoryId && { categoryId }),
      });

      return this.findOne(id);
    } catch (error) {
      this.logger.error('Error updating subcategory:', error);
      throw error;
    }
  }

  async remove(id: number, currentUser: User): Promise<Subcategory> {
    this.logger.debug('=== REMOVE SUBCATEGORY ===');
    this.logger.debug('SubcategoryId:', id);

    try {
      const subcategory = await this.findOne(id);

      // Validar acesso ao place
      this.validatePlaceAccess(subcategory.placeId, currentUser);

      // Verificar se existem empresas associadas
      if (subcategory.companies && subcategory.companies.length > 0) {
        throw new BadRequestException(
          'Não é possível excluir uma subcategoria que possui empresas associadas. Reassocie as empresas primeiro.',
        );
      }

      await this.subcategoryRepository.remove(subcategory);
      return subcategory;
    } catch (error) {
      this.logger.error('Error removing subcategory:', error);
      throw error;
    }
  }

  // CORREÇÃO: Implementar método para subcategorias com contagem de empresas
  async getSubcategoriesWithCompanyCount(
    placeId?: number,
  ): Promise<Array<Subcategory & { companyCount: number }>> {
    this.logger.debug('=== GET SUBCATEGORIES WITH COMPANY COUNT ===');
    this.logger.debug('PlaceId filter:', placeId);

    try {
      let query = this.subcategoryRepository
        .createQueryBuilder('subcategory')
        .leftJoinAndSelect('subcategory.place', 'place')
        .leftJoinAndSelect('subcategory.category', 'category')
        .leftJoinAndSelect('category.segments', 'segments')
        .leftJoin('subcategory.companies', 'company')
        .addSelect('COUNT(company.id)', 'companyCount')
        .groupBy('subcategory.id')
        .addGroupBy('place.id')
        .addGroupBy('category.id')
        .addGroupBy('segments.id')
        .orderBy('subcategory.categoryId', 'ASC')
        .addOrderBy('subcategory.order', 'ASC')
        .addOrderBy('subcategory.name', 'ASC');

      if (placeId) {
        query = query.where('subcategory.placeId = :placeId', { placeId });
      }

      const subcategoriesWithCount = await query.getRawAndEntities();

      const result = subcategoriesWithCount.entities.map((subcategory, index) => {
        (subcategory as any).companyCount =
          parseInt(subcategoriesWithCount.raw[index].companyCount) || 0;
        return subcategory as Subcategory & { companyCount: number };
      });

      this.logger.debug(`Found ${result.length} subcategories with company count`);
      return result;
    } catch (error) {
      this.logger.error('Error getting subcategories with company count:', error);
      throw error;
    }
  }
}
