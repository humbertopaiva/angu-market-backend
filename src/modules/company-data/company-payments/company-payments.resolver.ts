import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';

import { CompanyPaymentsService } from './company-payments.service';
import { CompanyPayments } from './entities/company-payments.entity';
import { CreateCompanyPaymentsInput } from './dto/create-company-payments.input';
import { UpdateCompanyPaymentsInput } from './dto/update-company-payments.input';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RoleType } from '@/modules/auth/entities/role.entity';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';
import { PaymentMethodType } from './enums/payment-method.enum';

@Resolver(() => CompanyPayments)
export class CompanyPaymentsResolver {
  private readonly logger = new Logger(CompanyPaymentsResolver.name);

  constructor(private readonly paymentsService: CompanyPaymentsService) {}

  /**
   * Criar configurações de pagamento da empresa
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN, COMPANY_STAFF
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => CompanyPayments)
  async createCompanyPayments(
    @Args('companyId', { type: () => Int }) companyId: number,
    @Args('createPaymentsInput') createPaymentsInput: CreateCompanyPaymentsInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('=== CREATE COMPANY PAYMENTS RESOLVER ===');
    this.logger.debug('CompanyId:', companyId);
    this.logger.debug('Input:', createPaymentsInput);

    try {
      const result = await this.paymentsService.create(companyId, createPaymentsInput, currentUser);
      this.logger.debug('Company payments created successfully');
      return result;
    } catch (error) {
      this.logger.error('Error creating company payments:', error.message);
      throw error;
    }
  }

  /**
   * Listar todas as configurações de pagamento
   * Permitido: SUPER_ADMIN, PLACE_ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Query(() => [CompanyPayments], { name: 'allCompanyPayments' })
  findAll() {
    this.logger.debug('Finding all company payments');
    return this.paymentsService.findAll();
  }

  /**
   * Buscar configurações de pagamento do usuário logado
   * Requer autenticação
   */
  @UseGuards(JwtAuthGuard)
  @Query(() => [CompanyPayments], { name: 'myCompanyPayments' })
  findByCurrentUser(@CurrentUser() currentUser: User) {
    this.logger.debug('Finding company payments for current user:', {
      id: currentUser?.id,
      email: currentUser?.email,
    });
    return this.paymentsService.findByUser(currentUser);
  }

  /**
   * Buscar configurações de pagamento por ID
   * Público (sem autenticação) - para exibição pública dos métodos aceitos
   */
  @Query(() => CompanyPayments, { name: 'companyPayments' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    this.logger.debug('Finding company payments by ID:', id);
    return this.paymentsService.findOne(id);
  }

  /**
   * Buscar configurações de pagamento por empresa
   * Público (sem autenticação) - para exibição pública dos métodos aceitos
   */
  @Query(() => CompanyPayments, { name: 'companyPaymentsByCompany', nullable: true })
  findByCompany(@Args('companyId', { type: () => Int }) companyId: number) {
    this.logger.debug('Finding company payments by company:', companyId);
    return this.paymentsService.findByCompany(companyId);
  }

  /**
   * Buscar configurações de pagamento por place
   * Público (sem autenticação) - para listagem pública
   */
  @Query(() => [CompanyPayments], { name: 'companyPaymentsByPlace' })
  findByPlace(@Args('placeId', { type: () => Int }) placeId: number) {
    this.logger.debug('Finding company payments by place:', placeId);
    return this.paymentsService.findByPlace(placeId);
  }

  /**
   * Buscar empresas por método de pagamento
   * Público (sem autenticação) - para busca por forma de pagamento
   */
  @Query(() => [CompanyPayments], { name: 'companiesByPaymentMethod' })
  findByPaymentMethod(
    @Args('paymentMethod', { type: () => PaymentMethodType }) paymentMethod: PaymentMethodType,
  ) {
    this.logger.debug('Finding companies by payment method:', paymentMethod);
    return this.paymentsService.findByPaymentMethod(paymentMethod);
  }

  /**
   * Buscar empresas que aceitam PIX
   * Público (sem autenticação) - útil para filtros
   */
  @Query(() => [CompanyPayments], { name: 'companiesThatAcceptPix' })
  findCompaniesThatAcceptPix(
    @Args('placeId', { type: () => Int, nullable: true }) placeId?: number,
  ) {
    this.logger.debug('Finding companies that accept PIX:', { placeId });
    return this.paymentsService.findCompaniesThatAcceptPix(placeId);
  }

  /**
   * Atualizar configurações de pagamento
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN, COMPANY_STAFF
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => CompanyPayments)
  updateCompanyPayments(
    @Args('updatePaymentsInput') updatePaymentsInput: UpdateCompanyPaymentsInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Updating company payments:', {
      id: updatePaymentsInput.id,
      currentUser: currentUser?.email,
    });
    return this.paymentsService.update(updatePaymentsInput.id, updatePaymentsInput, currentUser);
  }

  /**
   * Remover configurações de pagamento
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => Boolean)
  async removeCompanyPayments(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() currentUser: User,
  ): Promise<boolean> {
    this.logger.debug('Removing company payments:', id);

    try {
      await this.paymentsService.remove(id, currentUser);
      this.logger.debug('Company payments removed successfully');
      return true;
    } catch (error) {
      this.logger.error('Error removing company payments:', error.message);
      throw error;
    }
  }

  /**
   * Criar ou atualizar configurações de pagamento (upsert)
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN, COMPANY_STAFF
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => CompanyPayments)
  async upsertCompanyPayments(
    @Args('companyId', { type: () => Int }) companyId: number,
    @Args('paymentsData') paymentsData: CreateCompanyPaymentsInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Upserting company payments:', { companyId });

    try {
      const result = await this.paymentsService.upsert(companyId, paymentsData, currentUser);
      this.logger.debug('Company payments upserted successfully');
      return result;
    } catch (error) {
      this.logger.error('Error upserting company payments:', error.message);
      throw error;
    }
  }
}
