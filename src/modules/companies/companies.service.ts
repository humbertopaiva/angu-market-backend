// src/modules/companies/companies.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Company } from './entities/company.entity';
import { CreateCompanyInput } from './dto/create-company.input';
import { UpdateCompanyInput } from './dto/update-company.input';
import { User } from '../users/entities/user.entity';
import { RoleType } from '../auth/entities/role.entity';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  private validatePlaceAccess(placeId: number, user: User): void {
    const userRoles = user.userRoles?.map(ur => ur.role.name) || [];

    // Super admin pode acessar qualquer place
    if (userRoles.includes(RoleType.SUPER_ADMIN)) {
      return;
    }

    // Place admin só pode gerenciar empresas de seu place
    if (userRoles.includes(RoleType.PLACE_ADMIN)) {
      if (user.placeId !== placeId) {
        throw new ForbiddenException('Você não tem permissão para gerenciar empresas deste place');
      }
      return;
    }

    throw new ForbiddenException('Você não tem permissão para gerenciar empresas');
  }

  async create(createCompanyInput: CreateCompanyInput, currentUser: User): Promise<Company> {
    const { slug, placeId } = createCompanyInput;

    // Validar acesso ao place
    this.validatePlaceAccess(placeId, currentUser);

    // Verifica se já existe uma empresa com o mesmo slug
    const existingCompany = await this.companyRepository.findOne({
      where: { slug },
    });

    if (existingCompany) {
      throw new BadRequestException(`Já existe uma empresa com o slug: ${slug}`);
    }

    const company = this.companyRepository.create(createCompanyInput);
    return this.companyRepository.save(company);
  }

  async findAll(): Promise<Company[]> {
    return this.companyRepository.find({
      relations: ['place'],
    });
  }

  async findOne(id: number): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: ['place', 'users', 'category', 'subcategory'],
    });

    if (!company) {
      throw new NotFoundException(`Empresa com ID ${id} não encontrada`);
    }

    return company;
  }

  async findBySlug(slug: string): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { slug },
      relations: ['place', 'users', 'category', 'subcategory'],
    });

    if (!company) {
      throw new NotFoundException(`Empresa com slug ${slug} não encontrada`);
    }

    return company;
  }

  async findByPlace(placeId: number): Promise<Company[]> {
    return this.companyRepository.find({
      where: { placeId },
      relations: ['category', 'subcategory'],
    });
  }

  async findByUser(user: User): Promise<Company[]> {
    const userRoles = user.userRoles?.map(ur => ur.role.name) || [];

    // Super admin pode ver todas
    if (userRoles.includes(RoleType.SUPER_ADMIN)) {
      return this.findAll();
    }

    // Place admin pode ver todas do seu place
    if (userRoles.includes(RoleType.PLACE_ADMIN) && user.placeId) {
      return this.findByPlace(user.placeId);
    }

    // Company admin/staff pode ver apenas sua empresa
    if (user.companyId) {
      const company = await this.findOne(user.companyId);
      return [company];
    }

    return [];
  }

  async update(
    id: number,
    updateCompanyInput: UpdateCompanyInput,
    currentUser: User,
  ): Promise<Company> {
    const { slug, placeId } = updateCompanyInput;

    // Verifica se a empresa existe
    const company = await this.findOne(id);

    // Validar acesso
    this.validatePlaceAccess(company.placeId, currentUser);

    // Se está atualizando o place, validar acesso ao novo place também
    if (placeId && placeId !== company.placeId) {
      this.validatePlaceAccess(placeId, currentUser);
    }

    // Se está atualizando o slug, verifica se já existe outra empresa com o mesmo slug
    if (slug && slug !== company.slug) {
      const existingCompany = await this.companyRepository.findOne({
        where: { slug },
      });

      if (existingCompany && existingCompany.id !== id) {
        throw new BadRequestException(`Já existe uma empresa com o slug: ${slug}`);
      }
    }

    await this.companyRepository.update(id, updateCompanyInput);
    return this.findOne(id);
  }

  async remove(id: number, currentUser: User): Promise<Company> {
    const company = await this.findOne(id);

    // Validar acesso
    this.validatePlaceAccess(company.placeId, currentUser);

    await this.companyRepository.remove(company);
    return company;
  }
}
