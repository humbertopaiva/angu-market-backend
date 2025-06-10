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
import { DeliveryZoneType } from './enums/delivery-zone-type.enum';
import { FeeCalculationType } from './enums/fee-calculation-type.enum';

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

    if (userRoles.includes(RoleType.COMPANY_ADMIN) || userRoles.includes(RoleType.COMPANY_STAFF)) {
      if (user.companyId !== companyId) {
        throw new ForbiddenException('Você só pode gerenciar delivery da sua própria empresa');
      }
      return company;
    }

    throw new ForbiddenException('Você não tem permissão para gerenciar delivery desta empresa');
  }

  private validateDeliveryData(deliveryData: CreateCompanyDeliveryInput): void {
    // Validar configurações de taxa
    if (
      deliveryData.feeCalculationType === FeeCalculationType.BY_DISTANCE &&
      !deliveryData.feePerKm
    ) {
      throw new BadRequestException(
        'Taxa por quilômetro é obrigatória quando o cálculo é por distância',
      );
    }

    if (
      deliveryData.feeCalculationType === FeeCalculationType.FREE &&
      deliveryData.baseFee &&
      deliveryData.baseFee > 0
    ) {
      throw new BadRequestException('Taxa base deve ser zero quando entrega é gratuita');
    }

    // Validar configurações de idade
    if (deliveryData.requiresAge && !deliveryData.minimumAge) {
      throw new BadRequestException(
        'Idade mínima é obrigatória quando verificação de idade é exigida',
      );
    }

    // Validar valores de pedido
    if (deliveryData.minimumOrderValue && deliveryData.maximumOrderValue) {
      if (deliveryData.minimumOrderValue >= deliveryData.maximumOrderValue) {
        throw new BadRequestException('Valor mínimo deve ser menor que o valor máximo do pedido');
      }
    }

    // Validar programa de fidelidade
    if (deliveryData.hasLoyaltyProgram) {
      if (!deliveryData.loyaltyDiscountPercent || !deliveryData.loyaltyMinOrders) {
        throw new BadRequestException(
          'Desconto e número mínimo de pedidos são obrigatórios para programa de fidelidade',
        );
      }
    }

    // Validar capacidade
    if (deliveryData.maxConcurrentOrders && deliveryData.maxDailyOrders) {
      if (deliveryData.maxConcurrentOrders > deliveryData.maxDailyOrders) {
        throw new BadRequestException(
          'Pedidos simultâneos não pode ser maior que pedidos diários máximos',
        );
      }
    }
  }

  private validateDeliveryZoneData(zoneData: CreateDeliveryZoneInput): void {
    switch (zoneData.zoneType) {
      case DeliveryZoneType.RADIUS:
        if (!zoneData.radiusKm || zoneData.radiusKm <= 0) {
          throw new BadRequestException(
            'Raio em quilômetros é obrigatório para zona do tipo RADIUS',
          );
        }
        break;

      case DeliveryZoneType.POLYGON:
        if (!zoneData.coordinates) {
          throw new BadRequestException('Coordenadas são obrigatórias para zona do tipo POLYGON');
        }
        break;

      case DeliveryZoneType.NEIGHBORHOOD:
        if (!zoneData.neighborhoods || zoneData.neighborhoods.trim() === '') {
          throw new BadRequestException(
            'Lista de bairros é obrigatória para zona do tipo NEIGHBORHOOD',
          );
        }
        break;

      case DeliveryZoneType.POSTAL_CODE:
        if (!zoneData.postalCodes || zoneData.postalCodes.trim() === '') {
          throw new BadRequestException(
            'Lista de códigos postais é obrigatória para zona do tipo POSTAL_CODE',
          );
        }
        break;
    }
  }

  async create(
    companyId: number,
    createDeliveryInput: CreateCompanyDeliveryInput,
    currentUser: User,
  ): Promise<CompanyDelivery> {
    this.logger.debug('=== CREATE COMPANY DELIVERY ===');
    this.logger.debug('CompanyId:', companyId);
    this.logger.debug('Input:', createDeliveryInput);

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

      this.logger.debug('Company delivery created successfully:', {
        id: savedDelivery.id,
        companyId: savedDelivery.companyId,
        zonesCount: deliveryZones?.length || 0,
      });

      return this.findOne(savedDelivery.id);
    } catch (error) {
      this.logger.error('Error creating company delivery:', error.message);
      throw error;
    }
  }

  async findAll(): Promise<CompanyDelivery[]> {
    this.logger.debug('=== FIND ALL COMPANY DELIVERIES ===');

    try {
      const deliveries = await this.deliveryRepository.find({
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

      this.logger.debug(`Found ${deliveries.length} company deliveries`);
      return deliveries;
    } catch (error) {
      this.logger.error('Error finding all company deliveries:', error.message);
      throw error;
    }
  }

  async findOne(id: number): Promise<CompanyDelivery> {
    this.logger.debug('=== FIND ONE COMPANY DELIVERY ===');
    this.logger.debug('DeliveryId:', id);

    try {
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

      this.logger.debug('Company delivery found:', {
        id: delivery.id,
        companyId: delivery.companyId,
        companyName: delivery.company?.name,
        zonesCount: delivery.deliveryZones?.length || 0,
        isEnabled: delivery.isEnabled,
      });

      return delivery;
    } catch (error) {
      this.logger.error('Error finding company delivery:', error.message);
      throw error;
    }
  }

  async findByCompany(companyId: number): Promise<CompanyDelivery | null> {
    this.logger.debug('=== FIND COMPANY DELIVERY BY COMPANY ===');
    this.logger.debug('CompanyId:', companyId);

    try {
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

      if (delivery) {
        this.logger.debug('Company delivery found for company:', {
          id: delivery.id,
          companyId: delivery.companyId,
          companyName: delivery.company?.name,
          zonesCount: delivery.deliveryZones?.length || 0,
          isEnabled: delivery.isEnabled,
        });
      } else {
        this.logger.debug('No delivery found for company:', companyId);
      }

      return delivery;
    } catch (error) {
      this.logger.error('Error finding company delivery by company:', error.message);
      throw error;
    }
  }

  async update(
    id: number,
    updateDeliveryInput: UpdateCompanyDeliveryInput,
    currentUser: User,
  ): Promise<CompanyDelivery> {
    this.logger.debug('=== UPDATE COMPANY DELIVERY ===');
    this.logger.debug('DeliveryId:', id);
    this.logger.debug('Input:', updateDeliveryInput);

    try {
      const delivery = await this.findOne(id);
      await this.validateCompanyAccess(delivery.companyId, currentUser);

      const { deliveryZones, ...updateData } = updateDeliveryInput;
      const filteredUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([key, value]) => key !== 'id' && value !== undefined),
      );

      if (Object.keys(filteredUpdateData).length === 0 && !deliveryZones) {
        throw new BadRequestException('Nenhum campo válido para atualização foi fornecido');
      }

      // Validar dados se estão sendo atualizados
      if (Object.keys(filteredUpdateData).length > 0) {
        const mergedData = { ...delivery, ...filteredUpdateData } as CreateCompanyDeliveryInput;
        this.validateDeliveryData(mergedData);
        await this.deliveryRepository.update(id, filteredUpdateData);
      }

      // Atualizar zonas de entrega se fornecidas
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

      this.logger.debug('Company delivery updated successfully');
      return this.findOne(id);
    } catch (error) {
      this.logger.error('Error updating company delivery:', error.message);
      throw error;
    }
  }

  async remove(id: number, currentUser: User): Promise<void> {
    this.logger.debug('=== REMOVE COMPANY DELIVERY ===');
    this.logger.debug('DeliveryId:', id);

    try {
      const delivery = await this.findOne(id);
      await this.validateCompanyAccess(delivery.companyId, currentUser);

      await this.deliveryRepository.remove(delivery);
      this.logger.debug('Company delivery removed successfully');
    } catch (error) {
      this.logger.error('Error removing company delivery:', error.message);
      throw error;
    }
  }

  // Métodos específicos para zonas de entrega

  async addDeliveryZone(
    companyId: number,
    zoneData: CreateDeliveryZoneInput,
    currentUser: User,
  ): Promise<DeliveryZone> {
    this.logger.debug('=== ADD DELIVERY ZONE ===');
    this.logger.debug('CompanyId:', companyId);
    this.logger.debug('ZoneData:', zoneData);

    try {
      await this.validateCompanyAccess(companyId, currentUser);
      this.validateDeliveryZoneData(zoneData);

      const zone = this.deliveryZoneRepository.create({
        ...zoneData,
        companyId,
      });

      const savedZone = await this.deliveryZoneRepository.save(zone);

      this.logger.debug('Delivery zone added successfully:', {
        id: savedZone.id,
        name: savedZone.name,
        zoneType: savedZone.zoneType,
        companyId: savedZone.companyId,
      });

      return savedZone;
    } catch (error) {
      this.logger.error('Error adding delivery zone:', error.message);
      throw error;
    }
  }

  async updateDeliveryZone(
    id: number,
    updateZoneInput: UpdateDeliveryZoneInput,
    currentUser: User,
  ): Promise<DeliveryZone> {
    this.logger.debug('=== UPDATE DELIVERY ZONE ===');
    this.logger.debug('ZoneId:', id);
    this.logger.debug('Input:', updateZoneInput);

    try {
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

      const updatedZone = await this.deliveryZoneRepository.findOne({
        where: { id },
        relations: ['company'],
      });

      this.logger.debug('Delivery zone updated successfully');
      return updatedZone!;
    } catch (error) {
      this.logger.error('Error updating delivery zone:', error.message);
      throw error;
    }
  }

  async removeDeliveryZone(id: number, currentUser: User): Promise<void> {
    this.logger.debug('=== REMOVE DELIVERY ZONE ===');
    this.logger.debug('ZoneId:', id);

    try {
      const zone = await this.deliveryZoneRepository.findOne({
        where: { id },
        relations: ['company'],
      });

      if (!zone) {
        throw new NotFoundException(`Zona de entrega com ID ${id} não encontrada`);
      }

      await this.validateCompanyAccess(zone.companyId, currentUser);

      await this.deliveryZoneRepository.remove(zone);
      this.logger.debug('Delivery zone removed successfully');
    } catch (error) {
      this.logger.error('Error removing delivery zone:', error.message);
      throw error;
    }
  }

  // Métodos de cálculo e utilitários

  async calculateDeliveryFee(
    companyId: number,
    customerAddress: {
      latitude: number;
      longitude: number;
      postalCode?: string;
      neighborhood?: string;
    },
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
    this.logger.debug('CustomerAddress:', customerAddress);
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
      const applicableZone = await this.findApplicableZone(companyId, customerAddress);

      if (!applicableZone) {
        return {
          canDeliver: false,
          fee: 0,
          estimatedTime: 0,
          reason: 'Área não atendida',
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

      let fee = 0;
      const estimatedTime = applicableZone.estimatedTimeMinutes;

      // Calcular taxa baseada no tipo de cálculo
      switch (delivery.feeCalculationType) {
        case FeeCalculationType.FREE:
          fee = 0;
          break;

        case FeeCalculationType.FIXED:
          fee = delivery.baseFee;
          break;

        case FeeCalculationType.BY_ZONE:
          fee = applicableZone.deliveryFee;
          break;

        case FeeCalculationType.BY_DISTANCE:
          const distance = await this.calculateDistance(companyId, customerAddress);
          fee = delivery.baseFee + distance * (delivery.feePerKm || 0);
          break;

        case FeeCalculationType.BY_ORDER_VALUE:
          if (orderValue) {
            // Lógica customizada baseada no valor do pedido
            // Pode ser implementada conforme necessário
            fee = delivery.baseFee;
          }
          break;

        default:
          fee = delivery.baseFee;
      }

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

  private async findApplicableZone(
    companyId: number,
    customerAddress: {
      latitude: number;
      longitude: number;
      postalCode?: string;
      neighborhood?: string;
    },
  ): Promise<DeliveryZone | null> {
    const delivery = await this.findByCompany(companyId);
    if (!delivery || !delivery.deliveryZones) return null;

    // Ordenar zonas por prioridade (maior prioridade primeiro)
    const zones = delivery.deliveryZones.filter(zone => zone.isEnabled);
    zones.sort((a, b) => b.priority - a.priority);

    for (const zone of zones) {
      const isInZone = await this.isAddressInZone(zone, customerAddress);
      if (isInZone) {
        return zone;
      }
    }

    return null;
  }

  private async isAddressInZone(
    zone: DeliveryZone,
    customerAddress: {
      latitude: number;
      longitude: number;
      postalCode?: string;
      neighborhood?: string;
    },
  ): Promise<boolean> {
    switch (zone.zoneType) {
      case DeliveryZoneType.RADIUS:
        return this.isWithinRadius(zone, customerAddress);

      case DeliveryZoneType.POLYGON:
        return this.isWithinPolygon(zone, customerAddress);

      case DeliveryZoneType.NEIGHBORHOOD:
        return this.isInNeighborhood(zone, customerAddress);

      case DeliveryZoneType.POSTAL_CODE:
        return this.isInPostalCode(zone, customerAddress);

      default:
        return false;
    }
  }

  private async isWithinRadius(
    zone: DeliveryZone,
    customerAddress: { latitude: number; longitude: number },
  ): Promise<boolean> {
    if (!zone.radiusKm) return false;

    // Buscar coordenadas da empresa
    const company = await this.companyRepository.findOne({
      where: { id: zone.companyId },
    });

    if (!company || !company.latitude || !company.longitude) return false;

    const distance = this.calculateDistanceKm(
      company.latitude,
      company.longitude,
      customerAddress.latitude,
      customerAddress.longitude,
    );

    return distance <= zone.radiusKm;
  }

  private isWithinPolygon(
    zone: DeliveryZone,
    customerAddress: { latitude: number; longitude: number },
  ): boolean {
    // Implementar algoritmo de point-in-polygon
    // Esta é uma implementação simplificada
    if (!zone.coordinates) return false;

    try {
      const coordinates = zone.coordinates as any;
      if (!coordinates.coordinates || !coordinates.coordinates[0]) return false;

      const polygon = coordinates.coordinates[0];
      return this.pointInPolygon([customerAddress.longitude, customerAddress.latitude], polygon);
    } catch (error) {
      this.logger.error('Error checking polygon:', error);
      return false;
    }
  }

  private isInNeighborhood(
    zone: DeliveryZone,
    customerAddress: { neighborhood?: string },
  ): boolean {
    if (!zone.neighborhoods || !customerAddress.neighborhood) return false;

    const neighborhoods = zone.neighborhoods
      .toLowerCase()
      .split(',')
      .map(n => n.trim());

    return neighborhoods.includes(customerAddress.neighborhood.toLowerCase().trim());
  }

  private isInPostalCode(zone: DeliveryZone, customerAddress: { postalCode?: string }): boolean {
    if (!zone.postalCodes || !customerAddress.postalCode) return false;

    const postalCodes = zone.postalCodes.split(',').map(pc => pc.trim().replace(/\D/g, '')); // Remove non-digits

    const customerPostal = customerAddress.postalCode.replace(/\D/g, '');

    return postalCodes.some(pc => customerPostal.startsWith(pc));
  }

  // Algoritmo Ray Casting para point-in-polygon
  private pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
    const [x, y] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];

      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }

    return inside;
  }

  private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }

  private async calculateDistance(
    companyId: number,
    customerAddress: { latitude: number; longitude: number },
  ): Promise<number> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });

    if (!company || !company.latitude || !company.longitude) {
      return 0;
    }

    return this.calculateDistanceKm(
      company.latitude,
      company.longitude,
      customerAddress.latitude,
      customerAddress.longitude,
    );
  }

  // Métodos de conveniência para busca por contexto

  async findByPlace(placeId: number): Promise<CompanyDelivery[]> {
    this.logger.debug('=== FIND COMPANY DELIVERIES BY PLACE ===');
    this.logger.debug('PlaceId:', placeId);

    try {
      const deliveries = await this.deliveryRepository
        .createQueryBuilder('delivery')
        .leftJoinAndSelect('delivery.company', 'company')
        .leftJoinAndSelect('company.place', 'place')
        .leftJoinAndSelect('delivery.deliveryZones', 'deliveryZones')
        .where('company.placeId = :placeId', { placeId })
        .orderBy('delivery.createdAt', 'DESC')
        .getMany();

      this.logger.debug(`Found ${deliveries.length} company deliveries for place ${placeId}`);
      return deliveries;
    } catch (error) {
      this.logger.error('Error finding company deliveries by place:', error.message);
      throw error;
    }
  }

  async findByUser(user: User): Promise<CompanyDelivery[]> {
    this.logger.debug('=== FIND COMPANY DELIVERIES BY USER ===');

    try {
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
    } catch (error) {
      this.logger.error('Error finding company deliveries by user:', error.message);
      throw error;
    }
  }

  // Método para criar/atualizar em uma operação (upsert)
  async upsert(
    companyId: number,
    deliveryData: CreateCompanyDeliveryInput,
    currentUser: User,
  ): Promise<CompanyDelivery> {
    this.logger.debug('=== UPSERT COMPANY DELIVERY ===');
    this.logger.debug('CompanyId:', companyId);

    try {
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
    } catch (error) {
      this.logger.error('Error upserting company delivery:', error.message);
      throw error;
    }
  }

  // Métodos para busca e estatísticas

  async findCompaniesWithDelivery(placeId?: number): Promise<CompanyDelivery[]> {
    this.logger.debug('=== FIND COMPANIES WITH DELIVERY ===');
    this.logger.debug('PlaceId filter:', placeId);

    try {
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

      const deliveries = await query.orderBy('company.name', 'ASC').getMany();

      this.logger.debug(`Found ${deliveries.length} companies with delivery enabled`);
      return deliveries;
    } catch (error) {
      this.logger.error('Error finding companies with delivery:', error.message);
      throw error;
    }
  }

  async getDeliveryStatistics(placeId?: number): Promise<{
    totalCompanies: number;
    companiesWithDelivery: number;
    averageDeliveryFee: number;
    averageDeliveryTime: number;
    mostCommonFeeType: FeeCalculationType;
    deliveryTypeStats: Record<DeliveryType, number>;
  }> {
    this.logger.debug('=== GET DELIVERY STATISTICS ===');

    try {
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

      const feeTypes: FeeCalculationType[] = [];
      const deliveryTypeStats: Record<DeliveryType, number> = {
        [DeliveryType.DELIVERY]: 0,
        [DeliveryType.PICKUP]: 0,
        [DeliveryType.DINE_IN]: 0,
        [DeliveryType.DRIVE_THRU]: 0,
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

          feeTypes.push(delivery.feeCalculationType);

          delivery.availableTypes.forEach(type => {
            deliveryTypeStats[type]++;
          });
        }
      }

      const averageDeliveryFee = validFees > 0 ? totalFee / validFees : 0;
      const averageDeliveryTime = validTimes > 0 ? totalTime / validTimes : 0;

      // Calcular tipo de taxa mais comum
      const feeTypeFrequency = feeTypes.reduce(
        (acc, type) => {
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        },
        {} as Record<FeeCalculationType, number>,
      );

      const mostCommonFeeType =
        (Object.keys(feeTypeFrequency).reduce((a, b) =>
          feeTypeFrequency[a as FeeCalculationType] > feeTypeFrequency[b as FeeCalculationType]
            ? a
            : b,
        ) as FeeCalculationType) || FeeCalculationType.FIXED;

      const statistics = {
        totalCompanies,
        companiesWithDelivery,
        averageDeliveryFee: Math.round(averageDeliveryFee * 100) / 100,
        averageDeliveryTime: Math.round(averageDeliveryTime),
        mostCommonFeeType,
        deliveryTypeStats,
      };

      this.logger.debug('Delivery statistics:', statistics);
      return statistics;
    } catch (error) {
      this.logger.error('Error getting delivery statistics:', error.message);
      throw error;
    }
  }
}
