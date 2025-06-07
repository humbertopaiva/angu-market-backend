import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { Place } from '../places/entities/place.entity';
import { User } from '../users/entities/user.entity';
import { Category } from './entities/company-category.entity';
import { Segment } from './entities/segment.entity';
import { CreateCategoryInput } from './dto/create-company-category.input';
import { UpdateCategoryInput } from './dto/update-company-category.input';
import { RoleType } from '../auth/entities/role.entity';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Segment)
    private segmentRepository: Repository<Segment>,
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

    // Place admin só pode gerenciar categorias de seu place
    if (userRoles.includes(RoleType.PLACE_ADMIN)) {
      if (user.placeId !== placeId) {
        throw new ForbiddenException('Você não tem permissão para gerenciar este place');
      }
      return;
    }

    throw new ForbiddenException('Você não tem permissão para gerenciar categorias');
  }

  async create(createCategoryInput: CreateCategoryInput, currentUser: User): Promise<Category> {
    this.logger.debug('=== CREATE CATEGORY ===');
    this.logger.debug('Input:', createCategoryInput);

    const { slug, placeId, segmentIds, ...categoryData } = createCategoryInput;

    try {
      this.validatePlaceAccess(placeId, currentUser);

      // Verificar se o place existe
      const place = await this.placeRepository.findOne({
        where: { id: placeId },
      });

      if (!place) {
        throw new BadRequestException(`Place com ID ${placeId} não encontrado`);
      }

      // Verifica se já existe uma categoria com o mesmo slug no place
      const existingCategory = await this.categoryRepository.findOne({
        where: { slug, placeId },
      });

      if (existingCategory) {
        throw new BadRequestException(`Já existe uma categoria com o slug: ${slug} neste place`);
      }

      // Cria a categoria
      const category = this.categoryRepository.create({
        ...categoryData,
        slug,
        placeId,
      });
      const savedCategory = await this.categoryRepository.save(category);

      // Associa segmentos se fornecidos (devem ser do mesmo place)
      if (segmentIds && segmentIds.length > 0) {
        const segments = await this.segmentRepository.find({
          where: { id: In(segmentIds), placeId },
        });

        if (segments.length !== segmentIds.length) {
          throw new BadRequestException('Um ou mais segmentos não foram encontrados neste place');
        }

        savedCategory.segments = segments;
        await this.categoryRepository.save(savedCategory);
      }

      return this.findOne(savedCategory.id);
    } catch (error) {
      this.logger.error('Error creating category:', error);
      throw error;
    }
  }

  async findAll(): Promise<Category[]> {
    this.logger.debug('=== FIND ALL CATEGORIES ===');

    try {
      const categories = await this.categoryRepository.find({
        relations: {
          place: true,
          segments: true,
          subcategories: true,
          companies: true,
        },
        order: {
          placeId: 'ASC',
          order: 'ASC',
          name: 'ASC',
        },
      });

      this.logger.debug(`Found ${categories.length} categories`);

      // Log detalhado para debug
      categories.forEach((category, index) => {
        this.logger.debug(`Category ${index + 1}:`, {
          id: category.id,
          name: category.name,
          slug: category.slug,
          placeId: category.placeId,
          placeName: category.place?.name || 'No place loaded',
          segmentsCount: category.segments?.length || 0,
          subcategoriesCount: category.subcategories?.length || 0,
          companiesCount: category.companies?.length || 0,
          isActive: category.isActive,
        });
      });

      return categories;
    } catch (error) {
      this.logger.error('Error in findAll:', error);
      throw error;
    }
  }

  async findByPlace(placeId: number): Promise<Category[]> {
    this.logger.debug('=== FIND CATEGORIES BY PLACE ===');
    this.logger.debug('PlaceId:', placeId);

    try {
      const categories = await this.categoryRepository.find({
        where: { placeId },
        relations: {
          place: true,
          segments: true,
          subcategories: true,
          companies: true,
        },
        order: {
          order: 'ASC',
          name: 'ASC',
        },
      });

      this.logger.debug(`Found ${categories.length} categories for place ${placeId}`);
      return categories;
    } catch (error) {
      this.logger.error('Error in findByPlace:', error);
      throw error;
    }
  }

  async findOne(id: number): Promise<Category> {
    this.logger.debug('=== FIND ONE CATEGORY ===');
    this.logger.debug('CategoryId:', id);

    try {
      const category = await this.categoryRepository.findOne({
        where: { id },
        relations: {
          place: true,
          segments: true,
          subcategories: true,
          companies: true,
        },
      });

      if (!category) {
        throw new NotFoundException(`Categoria com ID ${id} não encontrada`);
      }

      this.logger.debug('Category found:', {
        id: category.id,
        name: category.name,
        placeId: category.placeId,
      });

      return category;
    } catch (error) {
      this.logger.error('Error in findOne:', error);
      throw error;
    }
  }

  async findBySlug(slug: string, placeId: number): Promise<Category> {
    this.logger.debug('=== FIND CATEGORY BY SLUG ===');
    this.logger.debug('Slug:', slug, 'PlaceId:', placeId);

    try {
      const category = await this.categoryRepository.findOne({
        where: { slug, placeId },
        relations: {
          place: true,
          segments: true,
          subcategories: true,
          companies: true,
        },
      });

      if (!category) {
        throw new NotFoundException(`Categoria com slug ${slug} não encontrada neste place`);
      }

      return category;
    } catch (error) {
      this.logger.error('Error in findBySlug:', error);
      throw error;
    }
  }

  async findBySegment(segmentId: number): Promise<Category[]> {
    this.logger.debug('=== FIND CATEGORIES BY SEGMENT ===');
    this.logger.debug('SegmentId:', segmentId);

    try {
      const categories = await this.categoryRepository
        .createQueryBuilder('category')
        .leftJoinAndSelect('category.place', 'place')
        .leftJoinAndSelect('category.segments', 'segment')
        .leftJoinAndSelect('category.subcategories', 'subcategories')
        .leftJoinAndSelect('category.companies', 'companies')
        .where('segment.id = :segmentId', { segmentId })
        .orderBy('category.order', 'ASC')
        .addOrderBy('category.name', 'ASC')
        .getMany();

      this.logger.debug(`Found ${categories.length} categories for segment ${segmentId}`);
      return categories;
    } catch (error) {
      this.logger.error('Error in findBySegment:', error);
      throw error;
    }
  }

  async update(
    id: number,
    updateCategoryInput: UpdateCategoryInput,
    currentUser: User,
  ): Promise<Category> {
    this.logger.debug('=== UPDATE CATEGORY ===');
    this.logger.debug('CategoryId:', id, 'Input:', updateCategoryInput);

    const { slug, placeId, segmentIds, ...categoryData } = updateCategoryInput;

    try {
      // Verifica se a categoria existe
      const category = await this.findOne(id);

      // Validar acesso ao place
      this.validatePlaceAccess(category.placeId, currentUser);

      // Se está atualizando o place, validar acesso ao novo place também
      if (placeId && placeId !== category.placeId) {
        this.validatePlaceAccess(placeId, currentUser);
      }

      // Se está atualizando o slug, verifica se já existe outra categoria com o mesmo slug no place
      if (slug && slug !== category.slug) {
        const existingCategory = await this.categoryRepository.findOne({
          where: { slug, placeId: placeId || category.placeId },
        });

        if (existingCategory && existingCategory.id !== id) {
          throw new BadRequestException(`Já existe uma categoria com o slug: ${slug} neste place`);
        }
      }

      // Atualiza os dados básicos
      await this.categoryRepository.update(id, {
        ...categoryData,
        ...(slug && { slug }),
        ...(placeId && { placeId }),
      });

      // Atualiza os segmentos se fornecidos (devem ser do mesmo place)
      if (segmentIds !== undefined) {
        const finalPlaceId = placeId || category.placeId;

        if (segmentIds.length > 0) {
          const segments = await this.segmentRepository.find({
            where: { id: In(segmentIds), placeId: finalPlaceId },
          });

          if (segments.length !== segmentIds.length) {
            throw new BadRequestException('Um ou mais segmentos não foram encontrados neste place');
          }

          category.segments = segments;
        } else {
          category.segments = [];
        }

        await this.categoryRepository.save(category);
      }

      return this.findOne(id);
    } catch (error) {
      this.logger.error('Error updating category:', error);
      throw error;
    }
  }

  async remove(id: number, currentUser: User): Promise<Category> {
    this.logger.debug('=== REMOVE CATEGORY ===');
    this.logger.debug('CategoryId:', id);

    try {
      const category = await this.findOne(id);

      // Validar acesso ao place
      this.validatePlaceAccess(category.placeId, currentUser);

      // Verifica se existem subcategorias associadas
      if (category.subcategories && category.subcategories.length > 0) {
        throw new BadRequestException(
          'Não é possível excluir uma categoria que possui subcategorias. Exclua as subcategorias primeiro.',
        );
      }

      await this.categoryRepository.remove(category);
      return category;
    } catch (error) {
      this.logger.error('Error removing category:', error);
      throw error;
    }
  }

  async addSegmentsToCategory(
    categoryId: number,
    segmentIds: number[],
    currentUser: User,
  ): Promise<Category> {
    this.logger.debug('=== ADD SEGMENTS TO CATEGORY ===');

    try {
      const category = await this.findOne(categoryId);

      // Validar acesso ao place
      this.validatePlaceAccess(category.placeId, currentUser);

      const segments = await this.segmentRepository.find({
        where: { id: In(segmentIds), placeId: category.placeId },
      });

      if (segments.length !== segmentIds.length) {
        throw new BadRequestException('Um ou mais segmentos não foram encontrados neste place');
      }

      // Adiciona os novos segmentos aos existentes
      const existingSegmentIds = (category.segments || []).map(seg => seg.id);
      const newSegments = segments.filter(seg => !existingSegmentIds.includes(seg.id));

      category.segments = [...(category.segments || []), ...newSegments];
      await this.categoryRepository.save(category);

      return this.findOne(categoryId);
    } catch (error) {
      this.logger.error('Error adding segments to category:', error);
      throw error;
    }
  }

  async removeSegmentsFromCategory(
    categoryId: number,
    segmentIds: number[],
    currentUser: User,
  ): Promise<Category> {
    this.logger.debug('=== REMOVE SEGMENTS FROM CATEGORY ===');

    try {
      const category = await this.findOne(categoryId);

      // Validar acesso ao place
      this.validatePlaceAccess(category.placeId, currentUser);

      category.segments = (category.segments || []).filter(seg => !segmentIds.includes(seg.id));

      await this.categoryRepository.save(category);
      return this.findOne(categoryId);
    } catch (error) {
      this.logger.error('Error removing segments from category:', error);
      throw error;
    }
  }
}
