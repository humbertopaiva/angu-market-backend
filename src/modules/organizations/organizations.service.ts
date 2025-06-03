// src/modules/organizations/organizations.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Organization } from './entities/organization.entity';
import { UpdateOrganizationInput } from './dto/update-organization.input';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
  ) {}

  async findMain(): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { slug: 'main-organization' },
      relations: ['places', 'users'],
    });

    if (!organization) {
      throw new NotFoundException('Organização principal não encontrada');
    }

    return organization;
  }

  async updateMain(
    updateOrganizationInput: Omit<UpdateOrganizationInput, 'id'>,
  ): Promise<Organization> {
    const organization = await this.findMain();

    // Não permitir alterar o slug da organização principal
    if (updateOrganizationInput.slug && updateOrganizationInput.slug !== 'main-organization') {
      throw new BadRequestException('Não é possível alterar o slug da organização principal');
    }

    const updateData = { ...updateOrganizationInput };
    delete updateData.slug; // Remover slug do update

    await this.organizationRepository.update(organization.id, updateData);
    return this.findMain();
  }

  // Métodos mantidos para compatibilidade
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
}
