import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Organization } from './entities/organization.entity';
import { CreateOrganizationInput } from './dto/create-organization.input';
import { UpdateOrganizationInput } from './dto/update-organization.input';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {}

  async create(createOrganizationInput: CreateOrganizationInput): Promise<Organization> {
    const { slug } = createOrganizationInput;

    // Verifica se já existe uma organização com o mesmo slug
    const existingOrganization = await this.organizationRepository.findOne({
      where: { slug },
    });

    if (existingOrganization) {
      throw new BadRequestException(`Já existe uma organização com o slug: ${slug}`);
    }

    const organization = this.organizationRepository.create(createOrganizationInput);
    return this.organizationRepository.save(organization);
  }

  async findAll(): Promise<Organization[]> {
    return this.organizationRepository.find({
      relations: ['places'],
    });
  }

  async findOne(id: number): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['places', 'users'],
    });

    if (!organization) {
      throw new NotFoundException(`Organização com ID ${id} não encontrada`);
    }

    return organization;
  }

  async findBySlug(slug: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { slug },
      relations: ['places', 'users'],
    });

    if (!organization) {
      throw new NotFoundException(`Organização com slug ${slug} não encontrada`);
    }

    return organization;
  }

  async update(
    id: number,
    updateOrganizationInput: UpdateOrganizationInput,
  ): Promise<Organization> {
    const { slug } = updateOrganizationInput;

    // Verifica se a organização existe
    const organization = await this.findOne(id);

    // Se está atualizando o slug, verifica se já existe outra organização com o mesmo slug
    if (slug && slug !== organization.slug) {
      const existingOrganization = await this.organizationRepository.findOne({
        where: { slug },
      });

      if (existingOrganization && existingOrganization.id !== id) {
        throw new BadRequestException(`Já existe uma organização com o slug: ${slug}`);
      }
    }

    await this.organizationRepository.update(id, updateOrganizationInput);
    return this.findOne(id);
  }

  async remove(id: number): Promise<Organization> {
    const organization = await this.findOne(id);
    await this.organizationRepository.remove(organization);
    return organization;
  }
}
