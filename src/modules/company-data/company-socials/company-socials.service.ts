import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CompanySocials } from './entities/company-socials.entity';
import { CompanySocial } from './entities/company-social.entity';
import { Company } from '@/modules/companies/entities/company.entity';
import { User } from '@/modules/users/entities/user.entity';
import { CreateCompanySocialsInput } from './dto/create-company-socials.input';
import { UpdateCompanySocialsInput } from './dto/update-company-socials.input';
import { CreateCompanySocialInput } from './dto/create-company-social.input';
import { UpdateCompanySocialInput } from './dto/update-company-social.input';
import { RoleType } from '@/modules/auth/entities/role.entity';
import { SocialNetworkType } from './enums/social-network.enum';

@Injectable()
export class CompanySocialsService {
  private readonly logger = new Logger(CompanySocialsService.name);

  constructor(
    @InjectRepository(CompanySocials)
    private socialsRepository: Repository<CompanySocials>,
    @InjectRepository(CompanySocial)
    private socialRepository: Repository<CompanySocial>,
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

    // Company admin pode acessar apenas sua própria empresa
    if (userRoles.includes(RoleType.COMPANY_ADMIN)) {
      if (user.companyId !== companyId) {
        throw new ForbiddenException('Você só pode gerenciar sua própria empresa');
      }
      return company;
    }

    throw new ForbiddenException(
      'Você não tem permissão para gerenciar redes sociais desta empresa',
    );
  }

  private validateSocialNetworksData(socialNetworks: CreateCompanySocialInput[]): void {
    if (!socialNetworks || socialNetworks.length === 0) {
      return;
    }

    // Verificar se não há redes sociais duplicadas
    const networkTypes = socialNetworks.map(social => social.networkType);
    const uniqueNetworkTypes = new Set(networkTypes);

    if (networkTypes.length !== uniqueNetworkTypes.size) {
      throw new BadRequestException(
        'Não é possível ter múltiplas entradas para a mesma rede social',
      );
    }

    // Verificar se apenas uma rede social é marcada como primária
    const primaryNetworks = socialNetworks.filter(social => social.isPrimary);
    if (primaryNetworks.length > 1) {
      throw new BadRequestException('Apenas uma rede social pode ser marcada como primária');
    }

    // Validar URLs específicas por rede social
    socialNetworks.forEach(social => {
      this.validateSocialUrl(social.networkType, social.url);
    });
  }

  private validateSocialUrl(networkType: SocialNetworkType, url: string): void {
    const urlPatterns: { [key in SocialNetworkType]?: RegExp } = {
      [SocialNetworkType.FACEBOOK]: /^https?:\/\/(www\.)?facebook\.com\/.+/i,
      [SocialNetworkType.INSTAGRAM]: /^https?:\/\/(www\.)?instagram\.com\/.+/i,
      [SocialNetworkType.TIKTOK]: /^https?:\/\/(www\.)?tiktok\.com\/.+/i,
      [SocialNetworkType.YOUTUBE]: /^https?:\/\/(www\.)?youtube\.com\/.+/i,
      [SocialNetworkType.LINKEDIN]: /^https?:\/\/(www\.)?linkedin\.com\/.+/i,
      [SocialNetworkType.TWITTER]: /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.+/i,
      [SocialNetworkType.WHATSAPP]: /^https?:\/\/(wa\.me\/|api\.whatsapp\.com\/send\?phone=).+/i,
      [SocialNetworkType.TELEGRAM]: /^https?:\/\/(t\.me\/|telegram\.me\/).+/i,
      [SocialNetworkType.PINTEREST]: /^https?:\/\/(www\.)?pinterest\.com\/.+/i,
      [SocialNetworkType.SNAPCHAT]: /^https?:\/\/(www\.)?snapchat\.com\/.+/i,
    };

    const pattern = urlPatterns[networkType];
    if (pattern && !pattern.test(url)) {
      throw new BadRequestException(
        `URL inválida para ${networkType}. Verifique se a URL está no formato correto.`,
      );
    }
  }

  async create(
    companyId: number,
    createSocialsInput: CreateCompanySocialsInput,
    currentUser: User,
  ): Promise<CompanySocials> {
    this.logger.debug('=== CREATE COMPANY SOCIALS ===');
    this.logger.debug('CompanyId:', companyId);
    this.logger.debug('Input:', createSocialsInput);

    try {
      // Validar acesso à empresa
      await this.validateCompanyAccess(companyId, currentUser);

      // Verificar se já existe configuração de redes sociais para esta empresa
      const existing = await this.socialsRepository.findOne({
        where: { companyId },
      });

      if (existing) {
        throw new BadRequestException(
          'Esta empresa já possui configurações de redes sociais cadastradas',
        );
      }

      // Validar dados das redes sociais
      if (createSocialsInput.socialNetworks) {
        this.validateSocialNetworksData(createSocialsInput.socialNetworks);
      }

      // Criar as configurações de redes sociais
      const { socialNetworks, ...socialsData } = createSocialsInput;
      const socials = this.socialsRepository.create({
        ...socialsData,
        companyId,
      });

      const savedSocials = await this.socialsRepository.save(socials);

      // Criar as redes sociais individuais se fornecidas
      if (socialNetworks && socialNetworks.length > 0) {
        for (const socialData of socialNetworks) {
          const social = this.socialRepository.create({
            ...socialData,
            companyId,
            lastUpdated: new Date(),
          });
          await this.socialRepository.save(social);
        }
      }

      this.logger.debug('Company socials created successfully:', {
        id: savedSocials.id,
        companyId: savedSocials.companyId,
        networksCount: socialNetworks?.length || 0,
      });

      return this.findOne(savedSocials.id);
    } catch (error) {
      this.logger.error('Error creating company socials:', error.message);
      throw error;
    }
  }

  async findAll(): Promise<CompanySocials[]> {
    this.logger.debug('=== FIND ALL COMPANY SOCIALS ===');

    try {
      const socials = await this.socialsRepository.find({
        relations: {
          company: {
            place: true,
            segment: true,
            category: true,
            subcategory: true,
          },
          socialNetworks: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });

      this.logger.debug(`Found ${socials.length} company socials`);
      return socials;
    } catch (error) {
      this.logger.error('Error finding all company socials:', error.message);
      throw error;
    }
  }

  async findOne(id: number): Promise<CompanySocials> {
    this.logger.debug('=== FIND ONE COMPANY SOCIALS ===');
    this.logger.debug('SocialsId:', id);

    try {
      const socials = await this.socialsRepository.findOne({
        where: { id },
        relations: {
          company: {
            place: true,
            segment: true,
            category: true,
            subcategory: true,
          },
          socialNetworks: true,
        },
      });

      if (!socials) {
        throw new NotFoundException(`Configurações de redes sociais com ID ${id} não encontradas`);
      }

      // Ordenar redes sociais por ordem de exibição
      if (socials.socialNetworks) {
        socials.socialNetworks.sort((a, b) => {
          if (a.isPrimary && !b.isPrimary) return -1;
          if (!a.isPrimary && b.isPrimary) return 1;
          return a.displayOrder - b.displayOrder;
        });
      }

      this.logger.debug('Company socials found:', {
        id: socials.id,
        companyId: socials.companyId,
        companyName: socials.company?.name,
        networksCount: socials.socialNetworks?.length || 0,
      });

      return socials;
    } catch (error) {
      this.logger.error('Error finding company socials:', error.message);
      throw error;
    }
  }

  async findByCompany(companyId: number): Promise<CompanySocials | null> {
    this.logger.debug('=== FIND COMPANY SOCIALS BY COMPANY ===');
    this.logger.debug('CompanyId:', companyId);

    try {
      const socials = await this.socialsRepository.findOne({
        where: { companyId },
        relations: {
          company: {
            place: true,
            segment: true,
            category: true,
            subcategory: true,
          },
          socialNetworks: true,
        },
      });

      if (socials && socials.socialNetworks) {
        // Ordenar redes sociais por ordem de exibição
        socials.socialNetworks.sort((a, b) => {
          if (a.isPrimary && !b.isPrimary) return -1;
          if (!a.isPrimary && b.isPrimary) return 1;
          return a.displayOrder - b.displayOrder;
        });
      }

      if (socials) {
        this.logger.debug('Company socials found for company:', {
          id: socials.id,
          companyId: socials.companyId,
          companyName: socials.company?.name,
          networksCount: socials.socialNetworks?.length || 0,
        });
      } else {
        this.logger.debug('No socials found for company:', companyId);
      }

      return socials;
    } catch (error) {
      this.logger.error('Error finding company socials by company:', error.message);
      throw error;
    }
  }

  async update(
    id: number,
    updateSocialsInput: UpdateCompanySocialsInput,
    currentUser: User,
  ): Promise<CompanySocials> {
    this.logger.debug('=== UPDATE COMPANY SOCIALS ===');
    this.logger.debug('SocialsId:', id);
    this.logger.debug('Input:', updateSocialsInput);

    try {
      // Buscar as configurações de redes sociais existentes
      const socials = await this.findOne(id);

      // Validar acesso à empresa
      await this.validateCompanyAccess(socials.companyId, currentUser);

      // Filtrar campos undefined/null
      const { socialNetworks, ...updateData } = updateSocialsInput;
      const filteredUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([key, value]) => key !== 'id' && value !== undefined),
      );

      if (Object.keys(filteredUpdateData).length === 0 && !socialNetworks) {
        throw new BadRequestException('Nenhum campo válido para atualização foi fornecido');
      }

      // Atualizar configurações gerais se fornecidas
      if (Object.keys(filteredUpdateData).length > 0) {
        await this.socialsRepository.update(id, filteredUpdateData);
      }

      // Atualizar redes sociais se fornecidas
      if (socialNetworks) {
        this.validateSocialNetworksData(socialNetworks);

        // Remover redes sociais existentes
        await this.socialRepository.delete({ companyId: socials.companyId });

        // Criar novas redes sociais
        for (const socialData of socialNetworks) {
          const social = this.socialRepository.create({
            ...socialData,
            companyId: socials.companyId,
            lastUpdated: new Date(),
          });
          await this.socialRepository.save(social);
        }
      }

      this.logger.debug('Company socials updated successfully');
      return this.findOne(id);
    } catch (error) {
      this.logger.error('Error updating company socials:', error.message);
      throw error;
    }
  }

  async remove(id: number, currentUser: User): Promise<void> {
    this.logger.debug('=== REMOVE COMPANY SOCIALS ===');
    this.logger.debug('SocialsId:', id);

    try {
      // Buscar as configurações de redes sociais existentes
      const socials = await this.findOne(id);

      // Validar acesso à empresa
      await this.validateCompanyAccess(socials.companyId, currentUser);

      // Remover todas as redes sociais individuais (cascade vai cuidar disso)
      await this.socialsRepository.remove(socials);

      this.logger.debug('Company socials removed successfully');
    } catch (error) {
      this.logger.error('Error removing company socials:', error.message);
      throw error;
    }
  }

  // Métodos específicos para redes sociais individuais

  async addSocialNetwork(
    companyId: number,
    socialData: CreateCompanySocialInput,
    currentUser: User,
  ): Promise<CompanySocial> {
    this.logger.debug('=== ADD SOCIAL NETWORK ===');
    this.logger.debug('CompanyId:', companyId);
    this.logger.debug('SocialData:', socialData);

    try {
      // Validar acesso à empresa
      await this.validateCompanyAccess(companyId, currentUser);

      // Verificar se já existe esta rede social para a empresa
      const existing = await this.socialRepository.findOne({
        where: { companyId, networkType: socialData.networkType },
      });

      if (existing) {
        throw new BadRequestException(
          `Esta empresa já possui ${socialData.networkType} cadastrado`,
        );
      }

      // Validar URL
      this.validateSocialUrl(socialData.networkType, socialData.url);

      // Se está marcando como primária, desmarcar outras
      if (socialData.isPrimary) {
        await this.socialRepository.update({ companyId }, { isPrimary: false });
      }

      // Criar a rede social
      const social = this.socialRepository.create({
        ...socialData,
        companyId,
        lastUpdated: new Date(),
      });

      const savedSocial = await this.socialRepository.save(social);

      this.logger.debug('Social network added successfully:', {
        id: savedSocial.id,
        networkType: savedSocial.networkType,
        companyId: savedSocial.companyId,
      });

      return savedSocial;
    } catch (error) {
      this.logger.error('Error adding social network:', error.message);
      throw error;
    }
  }

  async updateSocialNetwork(
    id: number,
    updateSocialInput: UpdateCompanySocialInput,
    currentUser: User,
  ): Promise<CompanySocial> {
    this.logger.debug('=== UPDATE SOCIAL NETWORK ===');
    this.logger.debug('SocialId:', id);
    this.logger.debug('Input:', updateSocialInput);

    try {
      // Buscar a rede social existente
      const social = await this.socialRepository.findOne({
        where: { id },
        relations: ['company'],
      });

      if (!social) {
        throw new NotFoundException(`Rede social com ID ${id} não encontrada`);
      }

      // Validar acesso à empresa
      await this.validateCompanyAccess(social.companyId, currentUser);

      // Filtrar campos undefined/null
      const updateData = Object.fromEntries(
        Object.entries(updateSocialInput).filter(
          ([key, value]) => key !== 'id' && value !== undefined,
        ),
      );

      if (Object.keys(updateData).length === 0) {
        throw new BadRequestException('Nenhum campo válido para atualização foi fornecido');
      }

      // Validar URL se estiver sendo atualizada
      if (updateData.url) {
        const networkType = updateData.networkType || social.networkType;
        this.validateSocialUrl(networkType, updateData.url);
      }

      // Se está marcando como primária, desmarcar outras
      if (updateData.isPrimary) {
        await this.socialRepository.update(
          { companyId: social.companyId, id: { $ne: id } } as any,
          { isPrimary: false },
        );
      }

      // Atualizar a rede social
      await this.socialRepository.update(id, {
        ...updateData,
        lastUpdated: new Date(),
      });

      const updatedSocial = await this.socialRepository.findOne({
        where: { id },
        relations: ['company'],
      });

      this.logger.debug('Social network updated successfully');
      return updatedSocial!;
    } catch (error) {
      this.logger.error('Error updating social network:', error.message);
      throw error;
    }
  }

  async removeSocialNetwork(id: number, currentUser: User): Promise<void> {
    this.logger.debug('=== REMOVE SOCIAL NETWORK ===');
    this.logger.debug('SocialId:', id);

    try {
      // Buscar a rede social existente
      const social = await this.socialRepository.findOne({
        where: { id },
        relations: ['company'],
      });

      if (!social) {
        throw new NotFoundException(`Rede social com ID ${id} não encontrada`);
      }

      // Validar acesso à empresa
      await this.validateCompanyAccess(social.companyId, currentUser);

      // Remover a rede social
      await this.socialRepository.remove(social);

      this.logger.debug('Social network removed successfully');
    } catch (error) {
      this.logger.error('Error removing social network:', error.message);
      throw error;
    }
  }

  // Métodos de conveniência para busca por contexto

  async findByPlace(placeId: number): Promise<CompanySocials[]> {
    this.logger.debug('=== FIND COMPANY SOCIALS BY PLACE ===');
    this.logger.debug('PlaceId:', placeId);

    try {
      const socials = await this.socialsRepository
        .createQueryBuilder('socials')
        .leftJoinAndSelect('socials.company', 'company')
        .leftJoinAndSelect('company.place', 'place')
        .leftJoinAndSelect('company.segment', 'segment')
        .leftJoinAndSelect('company.category', 'category')
        .leftJoinAndSelect('company.subcategory', 'subcategory')
        .leftJoinAndSelect('socials.socialNetworks', 'socialNetworks')
        .where('company.placeId = :placeId', { placeId })
        .orderBy('socials.createdAt', 'DESC')
        .addOrderBy('socialNetworks.isPrimary', 'DESC')
        .addOrderBy('socialNetworks.displayOrder', 'ASC')
        .getMany();

      this.logger.debug(`Found ${socials.length} company socials for place ${placeId}`);
      return socials;
    } catch (error) {
      this.logger.error('Error finding company socials by place:', error.message);
      throw error;
    }
  }

  async findByUser(user: User): Promise<CompanySocials[]> {
    this.logger.debug('=== FIND COMPANY SOCIALS BY USER ===');
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
        const socials = await this.findByCompany(user.companyId);
        return socials ? [socials] : [];
      }

      return [];
    } catch (error) {
      this.logger.error('Error finding company socials by user:', error.message);
      throw error;
    }
  }

  // Método para criar/atualizar em uma operação (upsert)
  async upsert(
    companyId: number,
    socialsData: CreateCompanySocialsInput,
    currentUser: User,
  ): Promise<CompanySocials> {
    this.logger.debug('=== UPSERT COMPANY SOCIALS ===');
    this.logger.debug('CompanyId:', companyId);

    try {
      // Validar acesso à empresa
      await this.validateCompanyAccess(companyId, currentUser);

      // Verificar se já existe
      const existing = await this.findByCompany(companyId);

      if (existing) {
        // Atualizar existente
        const updateInput: UpdateCompanySocialsInput = {
          id: existing.id,
          ...socialsData,
        };
        return this.update(existing.id, updateInput, currentUser);
      } else {
        // Criar novo
        return this.create(companyId, socialsData, currentUser);
      }
    } catch (error) {
      this.logger.error('Error upserting company socials:', error.message);
      throw error;
    }
  }

  // Métodos de busca por rede social específica

  async findBySocialNetwork(networkType: SocialNetworkType): Promise<CompanySocial[]> {
    this.logger.debug('=== FIND COMPANIES BY SOCIAL NETWORK ===');
    this.logger.debug('NetworkType:', networkType);

    try {
      const socials = await this.socialRepository.find({
        where: { networkType, isVisible: true },
        relations: {
          company: {
            place: true,
            segment: true,
            category: true,
            subcategory: true,
          },
        },
        order: {
          followersCount: 'DESC',
          lastUpdated: 'DESC',
        },
      });

      this.logger.debug(`Found ${socials.length} companies with ${networkType}`);
      return socials;
    } catch (error) {
      this.logger.error('Error finding companies by social network:', error.message);
      throw error;
    }
  }

  async findPopularSocials(placeId?: number, limit: number = 10): Promise<CompanySocial[]> {
    this.logger.debug('=== FIND POPULAR SOCIALS ===');
    this.logger.debug('PlaceId filter:', placeId, 'Limit:', limit);

    try {
      let query = this.socialRepository
        .createQueryBuilder('social')
        .leftJoinAndSelect('social.company', 'company')
        .leftJoinAndSelect('company.place', 'place')
        .where('social.isVisible = :isVisible', { isVisible: true })
        .andWhere('social.followersCount IS NOT NULL')
        .andWhere('social.followersCount > 0');

      if (placeId) {
        query = query.andWhere('company.placeId = :placeId', { placeId });
      }

      const socials = await query
        .orderBy('social.followersCount', 'DESC')
        .addOrderBy('social.lastUpdated', 'DESC')
        .limit(limit)
        .getMany();

      this.logger.debug(`Found ${socials.length} popular socials`);
      return socials;
    } catch (error) {
      this.logger.error('Error finding popular socials:', error.message);
      throw error;
    }
  }

  async findVerifiedSocials(placeId?: number): Promise<CompanySocial[]> {
    this.logger.debug('=== FIND VERIFIED SOCIALS ===');
    this.logger.debug('PlaceId filter:', placeId);

    try {
      let query = this.socialRepository
        .createQueryBuilder('social')
        .leftJoinAndSelect('social.company', 'company')
        .leftJoinAndSelect('company.place', 'place')
        .where('social.isVisible = :isVisible', { isVisible: true })
        .andWhere('social.isPrimary = :isPrimary', { isPrimary: true });

      if (placeId) {
        query = query.andWhere('company.placeId = :placeId', { placeId });
      }

      const socials = await query
        .orderBy('social.followersCount', 'DESC')
        .addOrderBy('company.name', 'ASC')
        .getMany();

      this.logger.debug(`Found ${socials.length} verified/primary socials`);
      return socials;
    } catch (error) {
      this.logger.error('Error finding verified socials:', error.message);
      throw error;
    }
  }

  // Método para atualizar métricas (seguidores, etc.)
  async updateSocialMetrics(
    id: number,
    followersCount: number,
    currentUser: User,
  ): Promise<CompanySocial> {
    this.logger.debug('=== UPDATE SOCIAL METRICS ===');
    this.logger.debug('SocialId:', id, 'FollowersCount:', followersCount);

    try {
      // Buscar a rede social existente
      const social = await this.socialRepository.findOne({
        where: { id },
        relations: ['company'],
      });

      if (!social) {
        throw new NotFoundException(`Rede social com ID ${id} não encontrada`);
      }

      // Validar acesso à empresa
      await this.validateCompanyAccess(social.companyId, currentUser);

      // Atualizar métricas
      await this.socialRepository.update(id, {
        followersCount,
        lastUpdated: new Date(),
      });

      const updatedSocial = await this.socialRepository.findOne({
        where: { id },
        relations: ['company'],
      });

      this.logger.debug('Social metrics updated successfully');
      return updatedSocial!;
    } catch (error) {
      this.logger.error('Error updating social metrics:', error.message);
      throw error;
    }
  }
}
