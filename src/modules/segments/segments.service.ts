import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { Segment } from './entities/segment.entity';
import { Place } from '../places/entities/place.entity';
import { User } from '../users/entities/user.entity';
import { CreateSegmentInput } from './dto/create-segment.input';
import { UpdateSegmentInput } from './dto/update-segment.input';
import { Category } from './entities/company-category.entity';
import { RoleType } from '../auth/entities/role.entity';

@Injectable()
export class SegmentsService {
  private readonly logger = new Logger(SegmentsService.name);

  constructor(
    @InjectRepository(Segment)
    private segmentRepository: Repository<Segment>,
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

    // Place admin só pode gerenciar segmentos de seu place
    if (userRoles.includes(RoleType.PLACE_ADMIN)) {
      if (user.placeId !== placeId) {
        throw new ForbiddenException('Você não tem permissão para gerenciar este place');
      }
      return;
    }

    throw new ForbiddenException('Você não tem permissão para gerenciar segmentos');
  }

  async create(createSegmentInput: CreateSegmentInput, currentUser: User): Promise<Segment> {
    this.logger.debug('=== CREATE SEGMENT ===');
    this.logger.debug('Input:', createSegmentInput);

    const { slug, placeId, categoryIds, ...segmentData } = createSegmentInput;

    try {
      this.validatePlaceAccess(placeId, currentUser);

      // Verificar se o place existe
      const place = await this.placeRepository.findOne({ where: { id: placeId } });
      if (!place) {
        throw new BadRequestException(`Place com ID ${placeId} não encontrado`);
      }

      // Verificar se já existe um segmento com o mesmo slug
      const existingSegment = await this.segmentRepository.findOne({
        where: { slug, placeId },
      });

      if (existingSegment) {
        throw new BadRequestException(`Já existe um segmento com o slug: ${slug} neste place`);
      }

      // Criar o segmento
      const segment = this.segmentRepository.create({
        ...segmentData,
        slug,
        placeId,
      });

      const savedSegment = await this.segmentRepository.save(segment);
      this.logger.debug('Segment created:', savedSegment);

      // Associar categorias se fornecidas
      if (categoryIds?.length) {
        const categories = await this.categoryRepository.find({
          where: { id: In(categoryIds), placeId },
        });

        if (categories.length !== categoryIds.length) {
          throw new BadRequestException('Uma ou mais categorias não foram encontradas neste place');
        }

        savedSegment.categories = categories;
        await this.segmentRepository.save(savedSegment);
      }

      return this.findOne(savedSegment.id);
    } catch (error) {
      this.logger.error('Error creating segment:', error);
      throw error;
    }
  }

  async findAll(): Promise<Segment[]> {
    this.logger.debug('=== FIND ALL SEGMENTS ===');

    try {
      const segments = await this.segmentRepository.find({
        relations: {
          place: true,
          categories: true,
        },
        order: {
          placeId: 'ASC',
          order: 'ASC',
          name: 'ASC',
        },
      });

      this.logger.debug(`Found ${segments.length} segments`);
      return segments;
    } catch (error) {
      this.logger.error('Error in findAll:', error);
      throw error;
    }
  }

  async findByPlace(placeId: number): Promise<Segment[]> {
    this.logger.debug('=== FIND SEGMENTS BY PLACE ===');
    this.logger.debug('PlaceId:', placeId);

    try {
      const segments = await this.segmentRepository.find({
        where: { placeId },
        relations: {
          place: true,
          categories: true,
        },
        order: {
          order: 'ASC',
          name: 'ASC',
        },
      });

      this.logger.debug(`Found ${segments.length} segments for place ${placeId}`);
      return segments;
    } catch (error) {
      this.logger.error('Error in findByPlace:', error);
      throw error;
    }
  }

  async findOne(id: number): Promise<Segment> {
    this.logger.debug('=== FIND ONE SEGMENT ===');
    this.logger.debug('SegmentId:', id);

    try {
      const segment = await this.segmentRepository.findOne({
        where: { id },
        relations: {
          place: true,
          categories: true,
        },
      });

      if (!segment) {
        throw new NotFoundException(`Segmento com ID ${id} não encontrado`);
      }

      this.logger.debug('Segment found:', {
        id: segment.id,
        name: segment.name,
        placeId: segment.placeId,
      });

      return segment;
    } catch (error) {
      this.logger.error('Error in findOne:', error);
      throw error;
    }
  }

  async findBySlug(slug: string, placeId: number): Promise<Segment> {
    this.logger.debug('=== FIND SEGMENT BY SLUG ===');
    this.logger.debug('Slug:', slug, 'PlaceId:', placeId);

    try {
      const segment = await this.segmentRepository.findOne({
        where: { slug, placeId },
        relations: {
          place: true,
          categories: true,
        },
      });

      if (!segment) {
        throw new NotFoundException(`Segmento com slug ${slug} não encontrado neste place`);
      }

      return segment;
    } catch (error) {
      this.logger.error('Error in findBySlug:', error);
      throw error;
    }
  }

  async update(
    id: number,
    updateSegmentInput: UpdateSegmentInput,
    currentUser: User,
  ): Promise<Segment> {
    this.logger.debug('=== UPDATE SEGMENT ===');
    this.logger.debug('SegmentId:', id, 'Input:', updateSegmentInput);

    const { slug, placeId, categoryIds, ...segmentData } = updateSegmentInput;

    try {
      const segment = await this.findOne(id);
      this.validatePlaceAccess(segment.placeId, currentUser);

      if (placeId && placeId !== segment.placeId) {
        this.validatePlaceAccess(placeId, currentUser);
      }

      if (slug && slug !== segment.slug) {
        const existingSegment = await this.segmentRepository.findOne({
          where: { slug, placeId: placeId || segment.placeId },
        });

        if (existingSegment && existingSegment.id !== id) {
          throw new BadRequestException(`Já existe um segmento com o slug: ${slug} neste place`);
        }
      }

      await this.segmentRepository.update(id, {
        ...segmentData,
        ...(slug && { slug }),
        ...(placeId && { placeId }),
      });

      if (categoryIds !== undefined) {
        const finalPlaceId = placeId || segment.placeId;

        if (categoryIds.length > 0) {
          const categories = await this.categoryRepository.find({
            where: { id: In(categoryIds), placeId: finalPlaceId },
          });

          if (categories.length !== categoryIds.length) {
            throw new BadRequestException(
              'Uma ou mais categorias não foram encontradas neste place',
            );
          }

          segment.categories = categories;
        } else {
          segment.categories = [];
        }

        await this.segmentRepository.save(segment);
      }

      return this.findOne(id);
    } catch (error) {
      this.logger.error('Error updating segment:', error);
      throw error;
    }
  }

  async remove(id: number, currentUser: User): Promise<Segment> {
    this.logger.debug('=== REMOVE SEGMENT ===');
    this.logger.debug('SegmentId:', id);

    try {
      const segment = await this.findOne(id);
      this.validatePlaceAccess(segment.placeId, currentUser);

      await this.segmentRepository.remove(segment);
      return segment;
    } catch (error) {
      this.logger.error('Error removing segment:', error);
      throw error;
    }
  }

  async addCategoriesToSegment(
    segmentId: number,
    categoryIds: number[],
    currentUser: User,
  ): Promise<Segment> {
    this.logger.debug('=== ADD CATEGORIES TO SEGMENT ===');

    try {
      const segment = await this.findOne(segmentId);
      this.validatePlaceAccess(segment.placeId, currentUser);

      const categories = await this.categoryRepository.find({
        where: { id: In(categoryIds), placeId: segment.placeId },
      });

      if (categories.length !== categoryIds.length) {
        throw new BadRequestException('Uma ou mais categorias não foram encontradas neste place');
      }

      const existingCategoryIds = (segment.categories || []).map(cat => cat.id);
      const newCategories = categories.filter(cat => !existingCategoryIds.includes(cat.id));

      segment.categories = [...(segment.categories || []), ...newCategories];
      await this.segmentRepository.save(segment);

      return this.findOne(segmentId);
    } catch (error) {
      this.logger.error('Error adding categories to segment:', error);
      throw error;
    }
  }

  async removeCategoriesFromSegment(
    segmentId: number,
    categoryIds: number[],
    currentUser: User,
  ): Promise<Segment> {
    this.logger.debug('=== REMOVE CATEGORIES FROM SEGMENT ===');

    try {
      const segment = await this.findOne(segmentId);
      this.validatePlaceAccess(segment.placeId, currentUser);

      segment.categories = (segment.categories || []).filter(cat => !categoryIds.includes(cat.id));

      await this.segmentRepository.save(segment);
      return this.findOne(segmentId);
    } catch (error) {
      this.logger.error('Error removing categories from segment:', error);
      throw error;
    }
  }
}
