// src/modules/places/places.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Place } from './entities/place.entity';
import { CreatePlaceInput } from './dto/create-place.input';
import { UpdatePlaceInput } from './dto/update-place.input';
import { SystemService } from '../common/config/system.service';

@Injectable()
export class PlacesService {
  constructor(
    @InjectRepository(Place)
    private placeRepository: Repository<Place>,
    private systemService: SystemService,
  ) {}

  async create(createPlaceInput: CreatePlaceInput): Promise<Place> {
    const { slug, ...placeData } = createPlaceInput;

    // Obter organização principal
    const mainOrganization = await this.systemService.getMainOrganization();

    // Verificar se já existe um place com o mesmo slug
    const existingPlace = await this.placeRepository.findOne({
      where: { slug },
    });

    if (existingPlace) {
      throw new BadRequestException(`Já existe um place com o slug: ${slug}`);
    }

    const place = this.placeRepository.create({
      ...placeData,
      slug,
      organizationId: mainOrganization.id,
    });

    return this.placeRepository.save(place);
  }

  async findAll(): Promise<Place[]> {
    return this.placeRepository.find({
      relations: ['organization', 'companies'],
    });
  }

  async findOne(id: number): Promise<Place> {
    const place = await this.placeRepository.findOne({
      where: { id },
      relations: ['organization', 'companies', 'users'],
    });

    if (!place) {
      throw new NotFoundException(`Place com ID ${id} não encontrado`);
    }

    return place;
  }

  async findBySlug(slug: string): Promise<Place> {
    const place = await this.placeRepository.findOne({
      where: { slug },
      relations: ['organization', 'companies', 'users'],
    });

    if (!place) {
      throw new NotFoundException(`Place com slug ${slug} não encontrado`);
    }

    return place;
  }

  async findByOrganization(): Promise<Place[]> {
    const mainOrganization = await this.systemService.getMainOrganization();

    return this.placeRepository.find({
      where: { organizationId: mainOrganization.id },
      relations: ['companies'],
    });
  }

  async update(id: number, updatePlaceInput: UpdatePlaceInput): Promise<Place> {
    const { slug, ...placeData } = updatePlaceInput;

    // Verifica se o place existe
    const place = await this.findOne(id);

    // Não permitir alterar organizationId
    // Removido porque organizationId não está presente em UpdatePlaceInput

    // Se está atualizando o slug, verifica se já existe outro place com o mesmo slug
    if (slug && slug !== place.slug) {
      const existingPlace = await this.placeRepository.findOne({
        where: { slug },
      });

      if (existingPlace && existingPlace.id !== id) {
        throw new BadRequestException(`Já existe um place com o slug: ${slug}`);
      }
    }

    await this.placeRepository.update(id, { ...placeData, ...(slug && { slug }) });
    return this.findOne(id);
  }

  async remove(id: number): Promise<Place> {
    const place = await this.findOne(id);
    await this.placeRepository.remove(place);
    return place;
  }
}
