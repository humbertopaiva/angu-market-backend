import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { Segment } from './entities/segment.entity';

import { Place } from '../places/entities/place.entity';
import { User } from '../users/entities/user.entity';
import { CreateSegmentInput } from './dto/create-segment.input';
import { UpdateSegmentInput } from './dto/update-segment.input';
import { Category } from './entities/company-category.entity';

@Injectable()
export class SegmentsService {
  constructor(
    @InjectRepository(Segment)
    private segmentRepository: Repository<Segment>,

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

  async create(createSegmentInput: CreateSegmentInput, currentUser: User): Promise<Segment> {
    const { slug, placeId, categoryIds, ...segmentData } = createSegmentInput;

    this.validatePlaceAccess(placeId, currentUser);

    const place = await this.placeRepository.findOne({ where: { id: placeId } });
    if (!place) {
      throw new BadRequestException(`Place com ID ${placeId} não encontrado`);
    }

    const existingSegment = await this.segmentRepository.findOne({
      where: { slug, placeId },
    });

    if (existingSegment) {
      throw new BadRequestException(`Já existe um segmento com o slug: ${slug} neste place`);
    }

    const segment = this.segmentRepository.create({
      ...segmentData,
      slug,
      placeId,
    });

    const savedSegment = await this.segmentRepository.save(segment);

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
  }

  async findAll(): Promise<Segment[]> {
    return this.segmentRepository.find({
      relations: ['place', 'categories'],
      order: { placeId: 'ASC', order: 'ASC', name: 'ASC' },
    });
  }

  async findByPlace(placeId: number): Promise<Segment[]> {
    return this.segmentRepository.find({
      where: { placeId },
      relations: ['categories', 'categories.subcategories'],
      order: { order: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Segment> {
    const segment = await this.segmentRepository.findOne({
      where: { id },
      relations: ['place', 'categories', 'categories.subcategories'],
    });

    if (!segment) {
      throw new NotFoundException(`Segmento com ID ${id} não encontrado`);
    }

    return segment;
  }

  async findBySlug(slug: string, placeId: number): Promise<Segment> {
    const segment = await this.segmentRepository.findOne({
      where: { slug, placeId },
      relations: ['place', 'categories', 'categories.subcategories'],
    });

    if (!segment) {
      throw new NotFoundException(`Segmento com slug ${slug} não encontrado neste place`);
    }

    return segment;
  }

  async update(
    id: number,
    updateSegmentInput: UpdateSegmentInput,
    currentUser: User,
  ): Promise<Segment> {
    const { slug, placeId, categoryIds, ...segmentData } = updateSegmentInput;

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
          throw new BadRequestException('Uma ou mais categorias não foram encontradas neste place');
        }

        segment.categories = categories;
      } else {
        segment.categories = [];
      }

      await this.segmentRepository.save(segment);
    }

    return this.findOne(id);
  }

  async remove(id: number, currentUser: User): Promise<Segment> {
    const segment = await this.findOne(id);
    this.validatePlaceAccess(segment.placeId, currentUser);
    await this.segmentRepository.remove(segment);
    return segment;
  }

  async addCategoriesToSegment(
    segmentId: number,
    categoryIds: number[],
    currentUser: User,
  ): Promise<Segment> {
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
  }

  async removeCategoriesFromSegment(
    segmentId: number,
    categoryIds: number[],
    currentUser: User,
  ): Promise<Segment> {
    const segment = await this.findOne(segmentId);
    this.validatePlaceAccess(segment.placeId, currentUser);

    segment.categories = (segment.categories || []).filter(cat => !categoryIds.includes(cat.id));

    await this.segmentRepository.save(segment);
    return this.findOne(segmentId);
  }
}
