// src/modules/company-data/company-delivery/company-delivery.service.ts - VERSÃO SIMPLIFICADA
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CompanyDelivery } from './entities/company-delivery.entity';
import { DeliveryZone } from './entities/delivery-zone.entity';
import { Company } from '@/modules/companies/entities/company.entity';
import { User } from '@/modules/users/entities/user.entity';
import { CreateCompanyDeliveryInput } from './dto/create-company-delivery.input';
import { UpdateCompanyDeliveryInput } from './dto/update-company-delivery.input';
import { CreateDeliveryZoneInput } from './dto/create-delivery-zone.input';
import { UpdateDeliveryZoneInput } from './dto/update-delivery-zone.input';
import { RoleType } from '@/modules/auth/entities/role.entity';
import { DeliveryType } from './enums/delivery-type.enum';

@Injectable()
export class CompanyDeliveryService {
  private readonly logger = new Logger(CompanyDeliveryService.name);

  constructor(
    @InjectRepository(CompanyDelivery)
    private deliveryRepository: Repository<CompanyDelivery>,
    @InjectRepository(DeliveryZone)
    private deliveryZoneRepository: Repository<DeliveryZone>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  private async validateCompanyAccess(companyId: number, user: User): Promise<Company> {
    this.logger.debug('=== VALIDATE COMPANY ACCESS ===');
    this.logger.debug('CompanyId:', companyId);

    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['place'],
    });

    if (!company) {
      throw new NotFoundException(`Empresa com ID ${companyId} não encontrada`);
    }

    const userRoles = user.userRoles?.map(ur => ur.role.name) || [];

    if (userRoles.includes(RoleType.SUPER_ADMIN)) {
      return company;
    }

    if (userRoles.includes(RoleType.PLACE_ADMIN)) {
      if (user.placeId !== company.placeId) {
        throw new ForbiddenException('Você não tem permissão para gerenciar esta empresa');
      }
      return company;
    }

    if (userRoles.includes(RoleType.COMPANY_ADMIN)) {
      if (user.companyId !== companyId) {
        throw new ForbiddenException('Você só pode gerenciar delivery da sua própria empresa');
      }
      return company;
    }

    throw new ForbiddenException('Você não tem permissão para gerenciar delivery desta empresa');
  }

  private validateDeliveryData(deliveryData: CreateCompanyDeliveryInput): void {
    // Validar valores de pedido
    if (deliveryData.minimumOrderValue && deliveryData.maximumOrderValue) {
      if (deliveryData.minimumOrderValue >= deliveryData.maximumOrderValue) {
        throw new BadRequestException('Valor mínimo deve ser menor que o valor máximo do pedido');
      }
    }
  }

  private validateDeliveryZoneData(zoneData: CreateDeliveryZoneInput): void {
    if (!zoneData.neighborhoods || zoneData.neighborhoods.trim() === '') {
      throw new BadRequestException('Lista de bairros é obrigatória');
    }
  }

  async create(
    companyId: number,
    createDeliveryInput: CreateCompanyDeliveryInput,
    currentUser: User,
  ): Promise<CompanyDelivery> {
    this.logger.debug('=== CREATE COMPANY DELIVERY ===');
    this.logger.debug('CompanyId:', companyId);

    try {
      await this.validateCompanyAccess(companyId, currentUser);

      const existing = await this.deliveryRepository.findOne({
        where: { companyId },
      });

      if (existing) {
        throw new BadRequestException(
          'Esta empresa já possui configurações de delivery cadastradas',
        );
      }

      this.validateDeliveryData(createDeliveryInput);

      if (createDeliveryInput.deliveryZones) {
        createDeliveryInput.deliveryZones.forEach(zone => {
          this.validateDeliveryZoneData(zone);
        });
      }

      const { deliveryZones, ...deliveryData } = createDeliveryInput;
      const delivery = this.deliveryRepository.create({
        ...deliveryData,
        companyId,
      });

      const savedDelivery = await this.deliveryRepository.save(delivery);

      if (deliveryZones && deliveryZones.length > 0) {
        for (const zoneData of deliveryZones) {
          const zone = this.deliveryZoneRepository.create({
            ...zoneData,
            companyId,
          });
          await this.deliveryZoneRepository.save(zone);
        }
      }

      this.logger.debug('Company delivery created successfully');
      return this.findOne(savedDelivery.id);
    } catch (error) {
      this.logger.error('Error creating company delivery:', error.message);
      throw error;
    }
  }

  async findAll(): Promise<CompanyDelivery[]> {
    return this.deliveryRepository.find({
      relations: {
        company: {
          place: true,
          segment: true,
          category: true,
          subcategory: true,
        },
        deliveryZones: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: number): Promise<CompanyDelivery> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id },
      relations: {
        company: {
          place: true,
          segment: true,
          category: true,
          subcategory: true,
        },
        deliveryZones: true,
      },
    });

    if (!delivery) {
      throw new NotFoundException(`Configurações de delivery com ID ${id} não encontradas`);
    }

    // Ordenar zonas por prioridade
    if (delivery.deliveryZones) {
      delivery.deliveryZones.sort((a, b) => b.priority - a.priority);
    }

    return delivery;
  }

  async findByCompany(companyId: number): Promise<CompanyDelivery | null> {
    const delivery = await this.deliveryRepository.findOne({
      where: { companyId },
      relations: {
        company: {
          place: true,
          segment: true,
          category: true,
          subcategory: true,
        },
        deliveryZones: true,
      },
    });

    if (delivery && delivery.deliveryZones) {
      delivery.deliveryZones.sort((a, b) => b.priority - a.priority);
    }

    return delivery;
  }

  async update(
    id: number,
    updateDeliveryInput: UpdateCompanyDeliveryInput,
    currentUser: User,
  ): Promise<CompanyDelivery> {
    const delivery = await this.findOne(id);
    await this.validateCompanyAccess(delivery.companyId, currentUser);

    const { deliveryZones, ...updateData } = updateDeliveryInput;
    const filteredUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([key, value]) => key !== 'id' && value !== undefined),
    );

    if (Object.keys(filteredUpdateData).length > 0) {
      const mergedData = { ...delivery, ...filteredUpdateData } as CreateCompanyDeliveryInput;
      this.validateDeliveryData(mergedData);
      await this.deliveryRepository.update(id, filteredUpdateData);
    }

    if (deliveryZones) {
      deliveryZones.forEach(zone => {
        this.validateDeliveryZoneData(zone);
      });

      // Remover zonas existentes
      await this.deliveryZoneRepository.delete({ companyId: delivery.companyId });

      // Criar novas zonas
      for (const zoneData of deliveryZones) {
        const zone = this.deliveryZoneRepository.create({
          ...zoneData,
          companyId: delivery.companyId,
        });
        await this.deliveryZoneRepository.save(zone);
      }
    }

    return this.findOne(id);
  }

  async remove(id: number, currentUser: User): Promise<void> {
    const delivery = await this.findOne(id);
    await this.validateCompanyAccess(delivery.companyId, currentUser);
    await this.deliveryRepository.remove(delivery);
  }

  // Método para calcular taxa de entrega por bairro
  async calculateDeliveryFee(
    companyId: number,
    neighborhood: string,
    orderValue?: number,
  ): Promise<{
    canDeliver: boolean;
    fee: number;
    estimatedTime: number;
    zone?: DeliveryZone;
    reason?: string;
  }> {
    this.logger.debug('=== CALCULATE DELIVERY FEE ===');
    this.logger.debug('CompanyId:', companyId);
    this.logger.debug('Neighborhood:', neighborhood);
    this.logger.debug('OrderValue:', orderValue);

    try {
      const delivery = await this.findByCompany(companyId);

      if (!delivery || !delivery.isEnabled) {
        return {
          canDeliver: false,
          fee: 0,
          estimatedTime: 0,
          reason: 'Delivery não disponível',
        };
      }

      if (!delivery.availableTypes.includes(DeliveryType.DELIVERY)) {
        return {
          canDeliver: false,
          fee: 0,
          estimatedTime: 0,
          reason: 'Entrega a domicílio não disponível',
        };
      }

      // Verificar valor mínimo do pedido
      if (delivery.minimumOrderValue && orderValue && orderValue < delivery.minimumOrderValue) {
        return {
          canDeliver: false,
          fee: 0,
          estimatedTime: 0,
          reason: `Valor mínimo do pedido: R$ ${delivery.minimumOrderValue.toFixed(2)}`,
        };
      }

      // Verificar valor máximo do pedido
      if (delivery.maximumOrderValue && orderValue && orderValue > delivery.maximumOrderValue) {
        return {
          canDeliver: false,
          fee: 0,
          estimatedTime: 0,
          reason: `Valor máximo do pedido: R$ ${delivery.maximumOrderValue.toFixed(2)}`,
        };
      }

      // Encontrar zona de entrega aplicável
      const applicableZone = await this.findApplicableZone(companyId, neighborhood);

      if (!applicableZone) {
        return {
          canDeliver: false,
          fee: 0,
          estimatedTime: 0,
          reason: 'Bairro não atendido',
        };
      }

      // Verificar valor mínimo da zona
      if (
        applicableZone.minimumOrderValue &&
        orderValue &&
        orderValue < applicableZone.minimumOrderValue
      ) {
        return {
          canDeliver: false,
          fee: 0,
          estimatedTime: 0,
          reason: `Valor mínimo para esta região: R$ ${applicableZone.minimumOrderValue.toFixed(2)}`,
        };
      }

      let fee = applicableZone.deliveryFee || delivery.baseFee;
      const estimatedTime = applicableZone.estimatedTimeMinutes || delivery.estimatedTimeMinutes;

      // Verificar entrega gratuita por valor mínimo
      if (
        delivery.freeDeliveryMinValue &&
        orderValue &&
        orderValue >= delivery.freeDeliveryMinValue
      ) {
        fee = 0;
      }

      return {
        canDeliver: true,
        fee: Math.max(0, fee),
        estimatedTime,
        zone: applicableZone,
      };
    } catch (error) {
      this.logger.error('Error calculating delivery fee:', error.message);
      return {
        canDeliver: false,
        fee: 0,
        estimatedTime: 0,
        reason: 'Erro ao calcular taxa de entrega',
      };
    }
  }

  private async findApplicableZone(companyId: number, neighborhood: string): Promise<DeliveryZone | null> {
    const delivery = await this.findByCompany(companyId);
    if (!delivery || !delivery.deliveryZones) return null;

    // Ordenar zonas por prioridade (maior prioridade primeiro)
    const zones = delivery.deliveryZones.filter(zone => zone.isEnabled);
    zones.sort((a, b) => b.priority - a.priority);

    for (const zone of zones) {
      if (this.isNeighborhoodInZone(zone, neighborhood)) {
        return zone;
      }
    }

    return null;
  }

  private isNeighborhoodInZone(zone: DeliveryZone, neighborhood: string): boolean {
    if (!zone.neighborhoods || !neighborhood) return false;

    const neighborhoods = zone.neighborhoods
      .toLowerCase()
      .split(',')
      .map(n => n.trim());

    return neighborhoods.includes(neighborhood.toLowerCase().trim());
  }

  // Métodos de conveniência
  async findByPlace(placeId: number): Promise<CompanyDelivery[]> {
    return this.deliveryRepository
      .createQueryBuilder('delivery')
      .leftJoinAndSelect('delivery.company', 'company')
      .leftJoinAndSelect('company.place', 'place')
      .leftJoinAndSelect('delivery.deliveryZones', 'deliveryZones')
      .where('company.placeId = :placeId', { placeId })
      .orderBy('delivery.createdAt', 'DESC')
      .getMany();
  }

  async findByUser(user: User): Promise<CompanyDelivery[]> {
    const userRoles = user.userRoles?.map(ur => ur.role.name) || [];

    if (userRoles.includes(RoleType.SUPER_ADMIN)) {
      return this.findAll();
    }

    if (userRoles.includes(RoleType.PLACE_ADMIN) && user.placeId) {
      return this.findByPlace(user.placeId);
    }

    if (user.companyId) {
      const delivery = await this.findByCompany(user.companyId);
      return delivery ? [delivery] : [];
    }

    return [];
  }

  async upsert(
    companyId: number,
    deliveryData: CreateCompanyDeliveryInput,
    currentUser: User,
  ): Promise<CompanyDelivery> {
    await this.validateCompanyAccess(companyId, currentUser);

    const existing = await this.findByCompany(companyId);

    if (existing) {
      const updateInput: UpdateCompanyDeliveryInput = {
        id: existing.id,
        ...deliveryData,
      };
      return this.update(existing.id, updateInput, currentUser);
    } else {
      return this.create(companyId, deliveryData, currentUser);
    }
  }

  async findCompaniesWithDelivery(placeId?: number): Promise<CompanyDelivery[]> {
    let query = this.deliveryRepository
      .createQueryBuilder('delivery')
      .leftJoinAndSelect('delivery.company', 'company')
      .leftJoinAndSelect('company.place', 'place')
      .leftJoinAndSelect('delivery.deliveryZones', 'deliveryZones')
      .where('delivery.isEnabled = :isEnabled', { isEnabled: true })
      .andWhere(':deliveryType = ANY(delivery.availableTypes)', {
        deliveryType: DeliveryType.DELIVERY,
      });

    if (placeId) {
      query = query.andWhere('company.placeId = :placeId', { placeId });
    }

    return query.orderBy('company.name', 'ASC').getMany();
  }

  // Métodos para zonas
  async addDeliveryZone(
    companyId: number,
    zoneData: CreateDeliveryZoneInput,
    currentUser: User,
  ): Promise<DeliveryZone> {
    await this.validateCompanyAccess(companyId, currentUser);
    this.validateDeliveryZoneData(zoneData);

    const zone = this.deliveryZoneRepository.create({
      ...zoneData,
      companyId,
    });

    return this.deliveryZoneRepository.save(zone);
  }

  async updateDeliveryZone(
    id: number,
    updateZoneInput: UpdateDeliveryZoneInput,
    currentUser: User,
  ): Promise<DeliveryZone> {
    const zone = await this.deliveryZoneRepository.findOne({
      where: { id },
      relations: ['company'],
    });

    if (!zone) {
      throw new NotFoundException(`Zona de entrega com ID ${id} não encontrada`);
    }

    await this.validateCompanyAccess(zone.companyId, currentUser);

    const updateData = Object.fromEntries(
      Object.entries(updateZoneInput).filter(
        ([key, value]) => key !== 'id' && value !== undefined,
      ),
    );

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('Nenhum campo válido para atualização foi fornecido');
    }

    // Validar dados atualizados
    const mergedData = { ...zone, ...updateData } as CreateDeliveryZoneInput;
    this.validateDeliveryZoneData(mergedData);

    await this.deliveryZoneRepository.update(id, updateData);

    return this.deliveryZoneRepository.findOne({
      where: { id },
      relations: ['company'],
    }) as Promise<DeliveryZone>;
  }

  async removeDeliveryZone(id: number, currentUser: User): Promise<void> {
    const zone = await this.deliveryZoneRepository.findOne({
      where: { id },
      relations: ['company'],
    });

    if (!zone) {
      throw new NotFoundException(`Zona de entrega com ID ${id} não encontrada`);
    }

    await this.validateCompanyAccess(zone.companyId, currentUser);
    await this.deliveryZoneRepository.remove(zone);
  }

  async getDeliveryStatistics(placeId?: number): Promise<{
    totalCompanies: number;
    companiesWithDelivery: number;
    averageDeliveryFee: number;
    averageDeliveryTime: number;
    deliveryTypeStats: Record<DeliveryType, number>;
  }> {
    let deliveries: CompanyDelivery[];

    if (placeId) {
      deliveries = await this.findByPlace(placeId);
    } else {
      deliveries = await this.findAll();
    }

    const totalCompanies = deliveries.length;
    const companiesWithDelivery = deliveries.filter(d => d.isEnabled).length;

    let totalFee = 0;
    let totalTime = 0;
    let validFees = 0;
    let validTimes = 0;

    const deliveryTypeStats: Record<DeliveryType, number> = {
      [DeliveryType.DELIVERY]: 0,
      [DeliveryType.PICKUP]: 0,
      [DeliveryType.DINE_IN]: 0,
    };

    for (const delivery of deliveries) {
      if (delivery.isEnabled) {
        if (delivery.baseFee > 0) {
          totalFee += delivery.baseFee;
          validFees++;
        }

        if (delivery.estimatedTimeMinutes > 0) {
          totalTime += delivery.estimatedTimeMinutes;
          validTimes++;
        }

        delivery.availableTypes.forEach(type => {
          deliveryTypeStats[type]++;
        });
      }
    }

    const averageDeliveryFee = validFees > 0 ? totalFee / validFees : 0;
    const averageDeliveryTime = validTimes > 0 ? totalTime / validTimes : 0;

    return {
      totalCompanies,
      companiesWithDelivery,
      averageDeliveryFee: Math.round(averageDeliveryFee * 100) / 100,
      averageDeliveryTime: Math.round(averageDeliveryTime),
      deliveryTypeStats,
    };
  }
}