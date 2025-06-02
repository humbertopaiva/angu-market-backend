import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { Place } from '../places/entities/place.entity';
import { User } from '../users/entities/user.entity';
import { Category } from './entities/company-category.entity';
import { Segment } from '../segments/entities/segment.entity';
import { CreateCategoryInput } from './dto/create-company-category.input';
import { UpdateCategoryInput } from './dto/update-company-category.input';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Segment)
    private segmentRepository: Repository<Segment>,
    @InjectRepository(Place)
    private placeRepository: Repository<Place>,
  ) {}

  private validatePlaceAccess(placeId: number, user: User): void {
    if (user.placeId !== placeId) {
      throw new ForbiddenException('Você não tem permissão para gerenciar este place');
    }
  }

  async create(createCategoryInput: CreateCategoryInput, currentUser: User): Promise<Category> {
    const { slug, placeId, segmentIds, ...categoryData } = createCategoryInput;

    // Validar acesso ao place
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
  }

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find({
      relations: ['place', 'segments', 'subcategories'],
      order: { placeId: 'ASC', order: 'ASC', name: 'ASC' },
    });
  }

  async findByPlace(placeId: number): Promise<Category[]> {
    return this.categoryRepository.find({
      where: { placeId },
      relations: ['segments', 'subcategories'],
      order: { order: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['place', 'segments', 'subcategories', 'companies'],
    });

    if (!category) {
      throw new NotFoundException(`Categoria com ID ${id} não encontrada`);
    }

    return category;
  }

  async findBySlug(slug: string, placeId: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { slug, placeId },
      relations: ['place', 'segments', 'subcategories', 'companies'],
    });

    if (!category) {
      throw new NotFoundException(`Categoria com slug ${slug} não encontrada neste place`);
    }

    return category;
  }

  async findBySegment(segmentId: number): Promise<Category[]> {
    return this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.place', 'place')
      .leftJoinAndSelect('category.segments', 'segment')
      .leftJoinAndSelect('category.subcategories', 'subcategories')
      .where('segment.id = :segmentId', { segmentId })
      .orderBy('category.order', 'ASC')
      .addOrderBy('category.name', 'ASC')
      .getMany();
  }

  async update(
    id: number,
    updateCategoryInput: UpdateCategoryInput,
    currentUser: User,
  ): Promise<Category> {
    const { slug, placeId, segmentIds, ...categoryData } = updateCategoryInput;

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
  }

  async remove(id: number, currentUser: User): Promise<Category> {
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
  }

  async addSegmentsToCategory(
    categoryId: number,
    segmentIds: number[],
    currentUser: User,
  ): Promise<Category> {
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
  }

  async removeSegmentsFromCategory(
    categoryId: number,
    segmentIds: number[],
    currentUser: User,
  ): Promise<Category> {
    const category = await this.findOne(categoryId);

    // Validar acesso ao place
    this.validatePlaceAccess(category.placeId, currentUser);

    category.segments = (category.segments || []).filter(seg => !segmentIds.includes(seg.id));

    await this.categoryRepository.save(category);
    return this.findOne(categoryId);
  }
}
