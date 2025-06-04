// src/modules/places/places.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Place } from './entities/place.entity';
import { CreatePlaceInput } from './dto/create-place.input';
import { UpdatePlaceInput } from './dto/update-place.input';
import { SystemService } from '../common/config/system.service';

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);

  constructor(
    @InjectRepository(Place)
    private placeRepository: Repository<Place>,
    private systemService: SystemService,
  ) {}

  async create(createPlaceInput: CreatePlaceInput): Promise<Place> {
    this.logger.debug('=== PLACES SERVICE CREATE DEBUG START ===');
    this.logger.debug('CreatePlaceInput received:', createPlaceInput);

    const { slug, ...placeData } = createPlaceInput;

    try {
      // Obter organização principal automaticamente
      this.logger.debug('Getting main organization...');
      const mainOrganization = await this.systemService.getMainOrganization();
      this.logger.debug('Main organization found:', {
        id: mainOrganization.id,
        name: mainOrganization.name,
        slug: mainOrganization.slug,
      });

      // Verificar se já existe um place com o mesmo slug
      this.logger.debug('Checking for existing place with slug:', slug);
      const existingPlace = await this.placeRepository.findOne({
        where: { slug },
      });

      if (existingPlace) {
        this.logger.error('Place with slug already exists:', slug);
        throw new BadRequestException(`Já existe um place com o slug: ${slug}`);
      }
      this.logger.debug('No existing place found with slug:', slug);

      // Criar a entidade sem especificar o UUID (será gerado automaticamente)
      const place = this.placeRepository.create({
        ...placeData,
        slug,
        organizationId: mainOrganization.id,
      });

      this.logger.debug('Place entity created, saving...');

      const savedPlace = await this.placeRepository.save(place);
      this.logger.debug('Place saved successfully:', {
        id: savedPlace.id,
        uuid: savedPlace.uuid,
        name: savedPlace.name,
        slug: savedPlace.slug,
        organizationId: savedPlace.organizationId,
      });

      this.logger.debug('=== PLACES SERVICE CREATE DEBUG END ===');
      return savedPlace;
    } catch (error) {
      this.logger.error('=== PLACES SERVICE CREATE ERROR ===');
      this.logger.error('Error type:', error.constructor.name);
      this.logger.error('Error message:', error.message);
      this.logger.error('Error stack:', error.stack);
      throw error;
    }
  }

  async findAll(): Promise<Place[]> {
    this.logger.debug('=== PLACES SERVICE FIND ALL DEBUG START ===');
    try {
      const places = await this.placeRepository.find({
        relations: ['organization', 'companies'],
      });
      this.logger.debug(`Found ${places.length} places`);
      this.logger.debug('=== PLACES SERVICE FIND ALL DEBUG END ===');
      return places;
    } catch (error) {
      this.logger.error('Error in findAll:', error.message);
      throw error;
    }
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
    this.logger.debug('=== PLACES SERVICE FIND BY ORGANIZATION DEBUG START ===');
    try {
      const mainOrganization = await this.systemService.getMainOrganization();
      this.logger.debug('Main organization:', {
        id: mainOrganization.id,
        name: mainOrganization.name,
      });

      const places = await this.placeRepository.find({
        where: { organizationId: mainOrganization.id },
        relations: ['companies'],
      });

      this.logger.debug(`Found ${places.length} places for organization`);
      this.logger.debug('=== PLACES SERVICE FIND BY ORGANIZATION DEBUG END ===');
      return places;
    } catch (error) {
      this.logger.error('Error in findByOrganization:', error.message);
      throw error;
    }
  }

  async update(id: number, updatePlaceInput: UpdatePlaceInput): Promise<Place> {
    const { slug, ...placeData } = updatePlaceInput;

    // Verifica se o place existe
    const place = await this.findOne(id);

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

    // Use soft delete em vez de hard delete
    await this.placeRepository.softDelete(id);

    // Retorna o place como estava antes da deleção
    return place;
  }
}
