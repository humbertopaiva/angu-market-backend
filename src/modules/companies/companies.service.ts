// src/modules/companies/companies.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
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
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  private validatePlaceAccess(placeId: number, user: User): void {
    this.logger.debug('=== VALIDATE PLACE ACCESS DEBUG START ===');
    this.logger.debug('PlaceId:', placeId);
    this.logger.debug('User:', {
      id: user?.id,
      email: user?.email,
      placeId: user?.placeId,
      userRoles:
        user?.userRoles?.map(ur => ({
          id: ur.id,
          roleId: ur.roleId,
          roleName: ur.role?.name,
        })) || 'no userRoles',
    });

    const userRoles = user.userRoles?.map(ur => ur.role.name) || [];
    this.logger.debug('Extracted user roles:', userRoles);

    // Super admin pode acessar qualquer place
    if (userRoles.includes(RoleType.SUPER_ADMIN)) {
      this.logger.debug('User is SUPER_ADMIN, access granted');
      return;
    }

    // Place admin só pode gerenciar empresas de seu place
    if (userRoles.includes(RoleType.PLACE_ADMIN)) {
      this.logger.debug('User is PLACE_ADMIN, checking place access');
      this.logger.debug('User placeId:', user.placeId);
      this.logger.debug('Requested placeId:', placeId);

      if (user.placeId !== placeId) {
        this.logger.error('Place admin trying to access different place');
        throw new ForbiddenException('Você não tem permissão para gerenciar empresas deste place');
      }
      this.logger.debug('Place admin has access to this place');
      return;
    }

    this.logger.error('User has no valid roles for company management');
    throw new ForbiddenException('Você não tem permissão para gerenciar empresas');
  }

  async create(createCompanyInput: CreateCompanyInput, currentUser: User): Promise<Company> {
    this.logger.debug('=== CREATE COMPANY DEBUG START ===');
    this.logger.debug('CreateCompanyInput:', createCompanyInput);
    this.logger.debug('CurrentUser:', {
      id: currentUser?.id,
      email: currentUser?.email,
      placeId: currentUser?.placeId,
    });

    const { slug, placeId, ...companyData } = createCompanyInput;

    try {
      // Validar acesso ao place
      this.logger.debug('Validating place access...');
      this.validatePlaceAccess(placeId, currentUser);
      this.logger.debug('Place access validated successfully');

      // Verificar se já existe uma empresa com o mesmo slug
      this.logger.debug('Checking for existing company with slug:', slug);
      const existingCompany = await this.companyRepository.findOne({
        where: { slug },
      });

      if (existingCompany) {
        this.logger.error('Company with slug already exists:', slug);
        throw new BadRequestException(`Já existe uma empresa com o slug: ${slug}`);
      }
      this.logger.debug('No existing company found with slug:', slug);

      // Filtrar campos undefined/null antes de criar
      const cleanedData = Object.fromEntries(
        Object.entries(companyData).filter(
          ([, value]) => value !== undefined && value !== null && value !== '',
        ),
      );

      // Se latitude/longitude são 0, remover para não causar problemas
      if (cleanedData.latitude === 0) delete cleanedData.latitude;
      if (cleanedData.longitude === 0) delete cleanedData.longitude;

      this.logger.debug('Cleaned company data:', cleanedData);

      const company = this.companyRepository.create({
        ...cleanedData,
        slug,
        placeId,
      });

      this.logger.debug('Company entity created, saving...');
      const savedCompany = await this.companyRepository.save(company);

      this.logger.debug('Company saved successfully:', {
        id: savedCompany.id,
        name: savedCompany.name,
        slug: savedCompany.slug,
        placeId: savedCompany.placeId,
      });

      // Buscar empresa completa com relacionamentos
      const completeCompany = await this.companyRepository.findOne({
        where: { id: savedCompany.id },
        relations: ['place', 'category', 'subcategory'],
      });

      this.logger.debug('=== CREATE COMPANY DEBUG END ===');
      return completeCompany || savedCompany;
    } catch (error) {
      this.logger.error('=== CREATE COMPANY ERROR ===');
      this.logger.error('Error type:', error.constructor.name);
      this.logger.error('Error message:', error.message);
      this.logger.error('Error stack:', error.stack);
      throw error;
    }
  }

  async findAll(): Promise<Company[]> {
    this.logger.debug('=== FIND ALL COMPANIES DEBUG START ===');

    try {
      const companies = await this.companyRepository.find({
        relations: {
          place: true, // CORREÇÃO: Usar sintaxe de objetos para relações
          category: true,
          subcategory: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });

      this.logger.debug(`Found ${companies.length} companies`);

      // Log das empresas encontradas para debug
      companies.forEach((company, index) => {
        this.logger.debug(`Company ${index + 1}:`, {
          id: company.id,
          name: company.name,
          slug: company.slug,
          placeId: company.placeId,
          placeName: company.place?.name || 'No place loaded',
          isActive: company.isActive,
        });
      });

      this.logger.debug('=== FIND ALL COMPANIES DEBUG END ===');
      return companies;
    } catch (error) {
      this.logger.error('=== FIND ALL COMPANIES ERROR ===');
      this.logger.error('Error type:', error.constructor.name);
      this.logger.error('Error message:', error.message);
      this.logger.error('Error stack:', error.stack);
      throw error;
    }
  }

  async findOne(id: number): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: {
        place: true,
        users: true,
        category: true,
        subcategory: true,
      },
    });

    if (!company) {
      throw new NotFoundException(`Empresa com ID ${id} não encontrada`);
    }

    return company;
  }

  async findBySlug(slug: string): Promise<Company> {
    const company = await this.companyRepository.findOne({
      where: { slug },
      relations: {
        place: true,
        users: true,
        category: true,
        subcategory: true,
      },
    });

    if (!company) {
      throw new NotFoundException(`Empresa com slug ${slug} não encontrada`);
    }

    return company;
  }

  async findByPlace(placeId: number): Promise<Company[]> {
    return this.companyRepository.find({
      where: { placeId },
      relations: {
        place: true,
        category: true,
        subcategory: true,
      },
      order: {
        createdAt: 'DESC',
      },
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

  async remove(id: number, currentUser: User): Promise<void> {
    // MUDANÇA: Era Promise<Company>, agora é Promise<void>
    this.logger.debug('=== REMOVE COMPANY DEBUG START ===');
    this.logger.debug('Company ID to remove:', id);

    // Buscar a empresa para validar acesso
    const company = await this.findOne(id);
    this.logger.debug('Company found for deletion:', {
      id: company.id,
      name: company.name,
      slug: company.slug,
    });

    // Validar acesso
    this.validatePlaceAccess(company.placeId, currentUser);

    // Deletar a empresa
    await this.companyRepository.remove(company);

    this.logger.debug('Company removed successfully');
    this.logger.debug('=== REMOVE COMPANY DEBUG END ===');

    // MUDANÇA: Não retorna nada (void)
  }
}
