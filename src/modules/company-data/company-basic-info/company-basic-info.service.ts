import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CompanyBasicInfo } from './entities/company-basic-info.entity';
import { Company } from '@/modules/companies/entities/company.entity';
import { User } from '@/modules/users/entities/user.entity';
import { CreateCompanyBasicInfoInput } from './dto/create-company-basic-info.input';
import { UpdateCompanyBasicInfoInput } from './dto/update-company-basic-info.input';
import { RoleType } from '@/modules/auth/entities/role.entity';

@Injectable()
export class CompanyBasicInfoService {
  private readonly logger = new Logger(CompanyBasicInfoService.name);

  constructor(
    @InjectRepository(CompanyBasicInfo)
    private basicInfoRepository: Repository<CompanyBasicInfo>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  private async validateCompanyAccess(companyId: number, user: User): Promise<Company> {
    this.logger.debug('=== VALIDATE COMPANY ACCESS ===');
    this.logger.debug('CompanyId:', companyId);
    this.logger.debug('User:', {
      id: user?.id,
      email: user?.email,
      companyId: user?.companyId,
      placeId: user?.placeId,
    });

    // Buscar a empresa
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['place'],
    });

    if (!company) {
      throw new NotFoundException(`Empresa com ID ${companyId} não encontrada`);
    }

    const userRoles = user.userRoles?.map(ur => ur.role.name) || [];
    this.logger.debug('User roles:', userRoles);

    // Super admin pode acessar qualquer empresa
    if (userRoles.includes(RoleType.SUPER_ADMIN)) {
      this.logger.debug('User is SUPER_ADMIN, access granted');
      return company;
    }

    // Place admin pode acessar empresas de seu place
    if (userRoles.includes(RoleType.PLACE_ADMIN)) {
      if (user.placeId !== company.placeId) {
        throw new ForbiddenException('Você não tem permissão para gerenciar esta empresa');
      }
      return company;
    }

    // Company admin/staff pode acessar apenas sua própria empresa
    if (userRoles.includes(RoleType.COMPANY_ADMIN) || userRoles.includes(RoleType.COMPANY_STAFF)) {
      if (user.companyId !== companyId) {
        throw new ForbiddenException('Você só pode gerenciar informações da sua própria empresa');
      }
      return company;
    }

    throw new ForbiddenException('Você não tem permissão para gerenciar informações desta empresa');
  }

  async create(
    companyId: number,
    createBasicInfoInput: CreateCompanyBasicInfoInput,
    currentUser: User,
  ): Promise<CompanyBasicInfo> {
    this.logger.debug('=== CREATE COMPANY BASIC INFO ===');
    this.logger.debug('CompanyId:', companyId);
    this.logger.debug('Input:', createBasicInfoInput);

    try {
      // Validar acesso à empresa
      await this.validateCompanyAccess(companyId, currentUser);

      // Verificar se já existe informação básica para esta empresa
      const existing = await this.basicInfoRepository.findOne({
        where: { companyId },
      });

      if (existing) {
        throw new BadRequestException('Esta empresa já possui informações básicas cadastradas');
      }

      // Criar as informações básicas
      const basicInfo = this.basicInfoRepository.create({
        ...createBasicInfoInput,
        companyId,
      });

      const savedBasicInfo = await this.basicInfoRepository.save(basicInfo);
      this.logger.debug('Company basic info created successfully:', {
        id: savedBasicInfo.id,
        companyId: savedBasicInfo.companyId,
      });

      return this.findOne(savedBasicInfo.id);
    } catch (error) {
      this.logger.error('Error creating company basic info:', error.message);
      throw error;
    }
  }

  async findAll(): Promise<CompanyBasicInfo[]> {
    this.logger.debug('=== FIND ALL COMPANY BASIC INFO ===');

    try {
      const basicInfos = await this.basicInfoRepository.find({
        relations: {
          company: {
            place: true,
            segment: true,
            category: true,
            subcategory: true,
          },
        },
        order: {
          createdAt: 'DESC',
        },
      });

      this.logger.debug(`Found ${basicInfos.length} company basic infos`);
      return basicInfos;
    } catch (error) {
      this.logger.error('Error finding all company basic infos:', error.message);
      throw error;
    }
  }

  async findOne(id: number): Promise<CompanyBasicInfo> {
    this.logger.debug('=== FIND ONE COMPANY BASIC INFO ===');
    this.logger.debug('BasicInfoId:', id);

    try {
      const basicInfo = await this.basicInfoRepository.findOne({
        where: { id },
        relations: {
          company: {
            place: true,
            segment: true,
            category: true,
            subcategory: true,
          },
        },
      });

      if (!basicInfo) {
        throw new NotFoundException(`Informações básicas com ID ${id} não encontradas`);
      }

      this.logger.debug('Company basic info found:', {
        id: basicInfo.id,
        companyId: basicInfo.companyId,
        companyName: basicInfo.company?.name,
      });

      return basicInfo;
    } catch (error) {
      this.logger.error('Error finding company basic info:', error.message);
      throw error;
    }
  }

  async findByCompany(companyId: number): Promise<CompanyBasicInfo | null> {
    this.logger.debug('=== FIND COMPANY BASIC INFO BY COMPANY ===');
    this.logger.debug('CompanyId:', companyId);

    try {
      const basicInfo = await this.basicInfoRepository.findOne({
        where: { companyId },
        relations: {
          company: {
            place: true,
            segment: true,
            category: true,
            subcategory: true,
          },
        },
      });

      if (basicInfo) {
        this.logger.debug('Company basic info found for company:', {
          id: basicInfo.id,
          companyId: basicInfo.companyId,
          companyName: basicInfo.company?.name,
        });
      } else {
        this.logger.debug('No basic info found for company:', companyId);
      }

      return basicInfo;
    } catch (error) {
      this.logger.error('Error finding company basic info by company:', error.message);
      throw error;
    }
  }

  async update(
    id: number,
    updateBasicInfoInput: UpdateCompanyBasicInfoInput,
    currentUser: User,
  ): Promise<CompanyBasicInfo> {
    this.logger.debug('=== UPDATE COMPANY BASIC INFO ===');
    this.logger.debug('BasicInfoId:', id);
    this.logger.debug('Input:', updateBasicInfoInput);

    try {
      // Buscar as informações básicas existentes
      const basicInfo = await this.findOne(id);

      // Validar acesso à empresa
      await this.validateCompanyAccess(basicInfo.companyId, currentUser);

      // Filtrar campos undefined/null
      const updateData = Object.fromEntries(
        Object.entries(updateBasicInfoInput).filter(
          ([key, value]) => key !== 'id' && value !== undefined,
        ),
      );

      if (Object.keys(updateData).length === 0) {
        throw new BadRequestException('Nenhum campo válido para atualização foi fornecido');
      }

      // Atualizar as informações
      await this.basicInfoRepository.update(id, updateData);

      this.logger.debug('Company basic info updated successfully');
      return this.findOne(id);
    } catch (error) {
      this.logger.error('Error updating company basic info:', error.message);
      throw error;
    }
  }

  async remove(id: number, currentUser: User): Promise<void> {
    this.logger.debug('=== REMOVE COMPANY BASIC INFO ===');
    this.logger.debug('BasicInfoId:', id);

    try {
      // Buscar as informações básicas existentes
      const basicInfo = await this.findOne(id);

      // Validar acesso à empresa
      await this.validateCompanyAccess(basicInfo.companyId, currentUser);

      // Remover as informações básicas
      await this.basicInfoRepository.remove(basicInfo);

      this.logger.debug('Company basic info removed successfully');
    } catch (error) {
      this.logger.error('Error removing company basic info:', error.message);
      throw error;
    }
  }

  // Métodos de conveniência para busca por contexto

  async findByPlace(placeId: number): Promise<CompanyBasicInfo[]> {
    this.logger.debug('=== FIND COMPANY BASIC INFO BY PLACE ===');
    this.logger.debug('PlaceId:', placeId);

    try {
      const basicInfos = await this.basicInfoRepository
        .createQueryBuilder('basicInfo')
        .leftJoinAndSelect('basicInfo.company', 'company')
        .leftJoinAndSelect('company.place', 'place')
        .leftJoinAndSelect('company.segment', 'segment')
        .leftJoinAndSelect('company.category', 'category')
        .leftJoinAndSelect('company.subcategory', 'subcategory')
        .where('company.placeId = :placeId', { placeId })
        .orderBy('basicInfo.createdAt', 'DESC')
        .getMany();

      this.logger.debug(`Found ${basicInfos.length} company basic infos for place ${placeId}`);
      return basicInfos;
    } catch (error) {
      this.logger.error('Error finding company basic infos by place:', error.message);
      throw error;
    }
  }

  async findByUser(user: User): Promise<CompanyBasicInfo[]> {
    this.logger.debug('=== FIND COMPANY BASIC INFO BY USER ===');
    this.logger.debug('User:', { id: user?.id, email: user?.email });

    try {
      const userRoles = user.userRoles?.map(ur => ur.role.name) || [];

      // Super admin pode ver todas
      if (userRoles.includes(RoleType.SUPER_ADMIN)) {
        return this.findAll();
      }

      // Place admin pode ver todas do seu place
      if (userRoles.includes(RoleType.PLACE_ADMIN) && user.placeId) {
        return this.findByPlace(user.placeId);
      }

      // Company admin/staff pode ver apenas da sua empresa
      if (user.companyId) {
        const basicInfo = await this.findByCompany(user.companyId);
        return basicInfo ? [basicInfo] : [];
      }

      return [];
    } catch (error) {
      this.logger.error('Error finding company basic infos by user:', error.message);
      throw error;
    }
  }

  // Método para criar/atualizar em uma operação (upsert)
  async upsert(
    companyId: number,
    basicInfoData: CreateCompanyBasicInfoInput,
    currentUser: User,
  ): Promise<CompanyBasicInfo> {
    this.logger.debug('=== UPSERT COMPANY BASIC INFO ===');
    this.logger.debug('CompanyId:', companyId);

    try {
      // Validar acesso à empresa
      await this.validateCompanyAccess(companyId, currentUser);

      // Verificar se já existe
      const existing = await this.findByCompany(companyId);

      if (existing) {
        // Atualizar existente
        const updateInput: UpdateCompanyBasicInfoInput = {
          id: existing.id,
          ...basicInfoData,
        };
        return this.update(existing.id, updateInput, currentUser);
      } else {
        // Criar novo
        return this.create(companyId, basicInfoData, currentUser);
      }
    } catch (error) {
      this.logger.error('Error upserting company basic info:', error.message);
      throw error;
    }
  }
}
