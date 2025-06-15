// src/modules/company-data/company-delivery/company-delivery.resolver.ts - VERSÃO SIMPLIFICADA
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';

import { CompanyDeliveryService } from './company-delivery.service';
import { CompanyDelivery } from './entities/company-delivery.entity';
import { DeliveryZone } from './entities/delivery-zone.entity';
import { CreateCompanyDeliveryInput } from './dto/create-company-delivery.input';
import { UpdateCompanyDeliveryInput } from './dto/update-company-delivery.input';
import { CreateDeliveryZoneInput } from './dto/create-delivery-zone.input';
import { UpdateDeliveryZoneInput } from './dto/update-delivery-zone.input';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RoleType } from '@/modules/auth/entities/role.entity';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';

@Resolver(() => CompanyDelivery)
export class CompanyDeliveryResolver {
  private readonly logger = new Logger(CompanyDeliveryResolver.name);

  constructor(private readonly deliveryService: CompanyDeliveryService) {}

  // ===== COMPANY DELIVERY =====

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => CompanyDelivery)
  async createCompanyDelivery(
    @Args('companyId', { type: () => Int }) companyId: number,
    @Args('createDeliveryInput') createDeliveryInput: CreateCompanyDeliveryInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Creating company delivery for company:', companyId);
    return this.deliveryService.create(companyId, createDeliveryInput, currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Query(() => [CompanyDelivery], { name: 'allCompanyDeliveries' })
  findAll() {
    return this.deliveryService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => [CompanyDelivery], { name: 'myCompanyDeliveries' })
  findByCurrentUser(@CurrentUser() currentUser: User) {
    return this.deliveryService.findByUser(currentUser);
  }

  @Query(() => CompanyDelivery, { name: 'companyDelivery' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.deliveryService.findOne(id);
  }

  @Query(() => CompanyDelivery, { name: 'companyDeliveryByCompany', nullable: true })
  findByCompany(@Args('companyId', { type: () => Int }) companyId: number) {
    return this.deliveryService.findByCompany(companyId);
  }

  @Query(() => [CompanyDelivery], { name: 'companyDeliveriesByPlace' })
  findByPlace(@Args('placeId', { type: () => Int }) placeId: number) {
    return this.deliveryService.findByPlace(placeId);
  }

  @Query(() => [CompanyDelivery], { name: 'companiesWithDelivery' })
  findCompaniesWithDelivery(@Args('placeId', { type: () => Int, nullable: true }) placeId?: number) {
    return this.deliveryService.findCompaniesWithDelivery(placeId);
  }

  // Calculadora de entrega simplificada (apenas por bairro)
  @Query(() => String, { name: 'calculateDeliveryFeeByNeighborhood' })
  async calculateDeliveryFeeByNeighborhood(
    @Args('companyId', { type: () => Int }) companyId: number,
    @Args('neighborhood') neighborhood: string,
    @Args('orderValue', { nullable: true }) orderValue?: number,
  ): Promise<string> {
    this.logger.debug('Calculating delivery fee by neighborhood:', {
      companyId,
      neighborhood,
      orderValue,
    });

    try {
      const result = await this.deliveryService.calculateDeliveryFee(
        companyId,
        neighborhood,
        orderValue,
      );
      return JSON.stringify(result);
    } catch (error) {
      this.logger.error('Error calculating delivery fee:', error.message);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Query(() => String, { name: 'deliveryStatistics' })
  async getDeliveryStatistics(
    @Args('placeId', { type: () => Int, nullable: true }) placeId?: number,
  ): Promise<string> {
    const result = await this.deliveryService.getDeliveryStatistics(placeId);
    return JSON.stringify(result);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => CompanyDelivery)
  updateCompanyDelivery(
    @Args('updateDeliveryInput') updateDeliveryInput: UpdateCompanyDeliveryInput,
    @CurrentUser() currentUser: User,
  ) {
    return this.deliveryService.update(updateDeliveryInput.id, updateDeliveryInput, currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => Boolean)
  async removeCompanyDelivery(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() currentUser: User,
  ): Promise<boolean> {
    await this.deliveryService.remove(id, currentUser);
    return true;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => CompanyDelivery)
  async upsertCompanyDelivery(
    @Args('companyId', { type: () => Int }) companyId: number,
    @Args('deliveryData') deliveryData: CreateCompanyDeliveryInput,
    @CurrentUser() currentUser: User,
  ) {
    return this.deliveryService.upsert(companyId, deliveryData, currentUser);
  }

  // ===== ZONAS DE ENTREGA =====

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => DeliveryZone)
  async addDeliveryZone(
    @Args('companyId', { type: () => Int }) companyId: number,
    @Args('zoneData') zoneData: CreateDeliveryZoneInput,
    @CurrentUser() currentUser: User,
  ) {
    return this.deliveryService.addDeliveryZone(companyId, zoneData, currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => DeliveryZone)
  updateDeliveryZone(
    @Args('updateZoneInput') updateZoneInput: UpdateDeliveryZoneInput,
    @CurrentUser() currentUser: User,
  ) {
    return this.deliveryService.updateDeliveryZone(updateZoneInput.id, updateZoneInput, currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => Boolean)
  async removeDeliveryZone(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() currentUser: User,
  ): Promise<boolean> {
    await this.deliveryService.removeDeliveryZone(id, currentUser);
    return true;
  }
}