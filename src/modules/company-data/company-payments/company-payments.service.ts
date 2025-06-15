import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CompanyPayments } from './entities/company-payments.entity';
import { Company } from '@/modules/companies/entities/company.entity';
import { User } from '@/modules/users/entities/user.entity';
import { CreateCompanyPaymentsInput, validatePixKey } from './dto/create-company-payments.input';
import { UpdateCompanyPaymentsInput } from './dto/update-company-payments.input';
import { RoleType } from '@/modules/auth/entities/role.entity';
import { PaymentMethodType } from './enums/payment-method.enum';

@Injectable()
export class CompanyPaymentsService {
  private readonly logger = new Logger(CompanyPaymentsService.name);

  constructor(
    @InjectRepository(CompanyPayments)
    private paymentsRepository: Repository<CompanyPayments>,
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
    if (userRoles.includes(RoleType.COMPANY_ADMIN) ) {
      if (user.companyId !== companyId) {
        throw new ForbiddenException('Você só pode gerenciar pagamentos da sua própria empresa');
      }
      return company;
    }

    throw new ForbiddenException('Você não tem permissão para gerenciar pagamentos desta empresa');
  }

  private validatePaymentData(paymentsData: CreateCompanyPaymentsInput): void {
    // Validar se PIX está nos métodos e os dados do PIX estão corretos
    if (paymentsData.paymentMethods.includes(PaymentMethodType.PIX)) {
      if (!paymentsData.pixKey || !paymentsData.pixKeyType) {
        throw new BadRequestException(
          'Chave PIX e tipo da chave são obrigatórios quando PIX é um método de pagamento aceito',
        );
      }

      // Validar formato da chave PIX
      if (!validatePixKey(paymentsData.pixKey, paymentsData.pixKeyType)) {
        throw new BadRequestException(
          `Formato da chave PIX inválido para o tipo ${paymentsData.pixKeyType}`,
        );
      }
    }

    // Validar parcelamento
    if (paymentsData.acceptsInstallments && !paymentsData.maxInstallments) {
      throw new BadRequestException(
        'Número máximo de parcelas é obrigatório quando parcelamento é aceito',
      );
    }

    if (
      paymentsData.maxInstallments &&
      !paymentsData.paymentMethods.includes(PaymentMethodType.CARTAO_CREDITO)
    ) {
      throw new BadRequestException(
        'Parcelamento só é válido quando cartão de crédito é aceito como método de pagamento',
      );
    }
  }

  async create(
    companyId: number,
    createPaymentsInput: CreateCompanyPaymentsInput,
    currentUser: User,
  ): Promise<CompanyPayments> {
    this.logger.debug('=== CREATE COMPANY PAYMENTS ===');
    this.logger.debug('CompanyId:', companyId);
    this.logger.debug('Input:', createPaymentsInput);

    try {
      // Validar acesso à empresa
      await this.validateCompanyAccess(companyId, currentUser);

      // Validar dados de pagamento
      this.validatePaymentData(createPaymentsInput);

      // Verificar se já existe configuração de pagamento para esta empresa
      const existing = await this.paymentsRepository.findOne({
        where: { companyId },
      });

      if (existing) {
        throw new BadRequestException(
          'Esta empresa já possui configurações de pagamento cadastradas',
        );
      }

      // Criar as configurações de pagamento
      const payments = this.paymentsRepository.create({
        ...createPaymentsInput,
        companyId,
      });

      const savedPayments = await this.paymentsRepository.save(payments);
      this.logger.debug('Company payments created successfully:', {
        id: savedPayments.id,
        companyId: savedPayments.companyId,
        paymentMethods: savedPayments.paymentMethods,
      });

      return this.findOne(savedPayments.id);
    } catch (error) {
      this.logger.error('Error creating company payments:', error.message);
      throw error;
    }
  }

  async findAll(): Promise<CompanyPayments[]> {
    this.logger.debug('=== FIND ALL COMPANY PAYMENTS ===');

    try {
      const payments = await this.paymentsRepository.find({
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

      this.logger.debug(`Found ${payments.length} company payments`);
      return payments;
    } catch (error) {
      this.logger.error('Error finding all company payments:', error.message);
      throw error;
    }
  }

  async findOne(id: number): Promise<CompanyPayments> {
    this.logger.debug('=== FIND ONE COMPANY PAYMENTS ===');
    this.logger.debug('PaymentsId:', id);

    try {
      const payments = await this.paymentsRepository.findOne({
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

      if (!payments) {
        throw new NotFoundException(`Configurações de pagamento com ID ${id} não encontradas`);
      }

      this.logger.debug('Company payments found:', {
        id: payments.id,
        companyId: payments.companyId,
        companyName: payments.company?.name,
        paymentMethods: payments.paymentMethods,
      });

      return payments;
    } catch (error) {
      this.logger.error('Error finding company payments:', error.message);
      throw error;
    }
  }

  async findByCompany(companyId: number): Promise<CompanyPayments | null> {
    this.logger.debug('=== FIND COMPANY PAYMENTS BY COMPANY ===');
    this.logger.debug('CompanyId:', companyId);

    try {
      const payments = await this.paymentsRepository.findOne({
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

      if (payments) {
        this.logger.debug('Company payments found for company:', {
          id: payments.id,
          companyId: payments.companyId,
          companyName: payments.company?.name,
          paymentMethods: payments.paymentMethods,
        });
      } else {
        this.logger.debug('No payments found for company:', companyId);
      }

      return payments;
    } catch (error) {
      this.logger.error('Error finding company payments by company:', error.message);
      throw error;
    }
  }

  async update(
    id: number,
    updatePaymentsInput: UpdateCompanyPaymentsInput,
    currentUser: User,
  ): Promise<CompanyPayments> {
    this.logger.debug('=== UPDATE COMPANY PAYMENTS ===');
    this.logger.debug('PaymentsId:', id);
    this.logger.debug('Input:', updatePaymentsInput);

    try {
      // Buscar as configurações de pagamento existentes
      const payments = await this.findOne(id);

      // Validar acesso à empresa
      await this.validateCompanyAccess(payments.companyId, currentUser);

      // Filtrar campos undefined/null
      const updateData = Object.fromEntries(
        Object.entries(updatePaymentsInput).filter(
          ([key, value]) => key !== 'id' && value !== undefined,
        ),
      );

      if (Object.keys(updateData).length === 0) {
        throw new BadRequestException('Nenhum campo válido para atualização foi fornecido');
      }

      // Validar dados se estão sendo atualizados
      if (updateData.paymentMethods || updateData.pixKey || updateData.pixKeyType) {
        const mergedData = { ...payments, ...updateData } as CreateCompanyPaymentsInput;
        this.validatePaymentData(mergedData);
      }

      // Atualizar as configurações
      await this.paymentsRepository.update(id, updateData);

      this.logger.debug('Company payments updated successfully');
      return this.findOne(id);
    } catch (error) {
      this.logger.error('Error updating company payments:', error.message);
      throw error;
    }
  }

  async remove(id: number, currentUser: User): Promise<void> {
    this.logger.debug('=== REMOVE COMPANY PAYMENTS ===');
    this.logger.debug('PaymentsId:', id);

    try {
      // Buscar as configurações de pagamento existentes
      const payments = await this.findOne(id);

      // Validar acesso à empresa
      await this.validateCompanyAccess(payments.companyId, currentUser);

      // Remover as configurações de pagamento
      await this.paymentsRepository.remove(payments);

      this.logger.debug('Company payments removed successfully');
    } catch (error) {
      this.logger.error('Error removing company payments:', error.message);
      throw error;
    }
  }

  // Métodos de conveniência para busca por contexto

  async findByPlace(placeId: number): Promise<CompanyPayments[]> {
    this.logger.debug('=== FIND COMPANY PAYMENTS BY PLACE ===');
    this.logger.debug('PlaceId:', placeId);

    try {
      const payments = await this.paymentsRepository
        .createQueryBuilder('payments')
        .leftJoinAndSelect('payments.company', 'company')
        .leftJoinAndSelect('company.place', 'place')
        .leftJoinAndSelect('company.segment', 'segment')
        .leftJoinAndSelect('company.category', 'category')
        .leftJoinAndSelect('company.subcategory', 'subcategory')
        .where('company.placeId = :placeId', { placeId })
        .orderBy('payments.createdAt', 'DESC')
        .getMany();

      this.logger.debug(`Found ${payments.length} company payments for place ${placeId}`);
      return payments;
    } catch (error) {
      this.logger.error('Error finding company payments by place:', error.message);
      throw error;
    }
  }

  async findByUser(user: User): Promise<CompanyPayments[]> {
    this.logger.debug('=== FIND COMPANY PAYMENTS BY USER ===');
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
        const payments = await this.findByCompany(user.companyId);
        return payments ? [payments] : [];
      }

      return [];
    } catch (error) {
      this.logger.error('Error finding company payments by user:', error.message);
      throw error;
    }
  }

  // Método para criar/atualizar em uma operação (upsert)
  async upsert(
    companyId: number,
    paymentsData: CreateCompanyPaymentsInput,
    currentUser: User,
  ): Promise<CompanyPayments> {
    this.logger.debug('=== UPSERT COMPANY PAYMENTS ===');
    this.logger.debug('CompanyId:', companyId);

    try {
      // Validar acesso à empresa
      await this.validateCompanyAccess(companyId, currentUser);

      // Verificar se já existe
      const existing = await this.findByCompany(companyId);

      if (existing) {
        // Atualizar existente
        const updateInput: UpdateCompanyPaymentsInput = {
          id: existing.id,
          ...paymentsData,
        };
        return this.update(existing.id, updateInput, currentUser);
      } else {
        // Criar novo
        return this.create(companyId, paymentsData, currentUser);
      }
    } catch (error) {
      this.logger.error('Error upserting company payments:', error.message);
      throw error;
    }
  }

  // Métodos de busca por método de pagamento

  async findByPaymentMethod(paymentMethod: PaymentMethodType): Promise<CompanyPayments[]> {
    this.logger.debug('=== FIND COMPANIES BY PAYMENT METHOD ===');
    this.logger.debug('PaymentMethod:', paymentMethod);

    try {
      const payments = await this.paymentsRepository
        .createQueryBuilder('payments')
        .leftJoinAndSelect('payments.company', 'company')
        .leftJoinAndSelect('company.place', 'place')
        .where(':paymentMethod = ANY(payments.paymentMethods)', { paymentMethod })
        .orderBy('company.name', 'ASC')
        .getMany();

      this.logger.debug(`Found ${payments.length} companies accepting ${paymentMethod}`);
      return payments;
    } catch (error) {
      this.logger.error('Error finding companies by payment method:', error.message);
      throw error;
    }
  }

  async findCompaniesThatAcceptPix(placeId?: number): Promise<CompanyPayments[]> {
    this.logger.debug('=== FIND COMPANIES THAT ACCEPT PIX ===');
    this.logger.debug('PlaceId filter:', placeId);

    try {
      let query = this.paymentsRepository
        .createQueryBuilder('payments')
        .leftJoinAndSelect('payments.company', 'company')
        .leftJoinAndSelect('company.place', 'place')
        .where(':pixMethod = ANY(payments.paymentMethods)', {
          pixMethod: PaymentMethodType.PIX,
        })
        .andWhere('payments.pixKey IS NOT NULL');

      if (placeId) {
        query = query.andWhere('company.placeId = :placeId', { placeId });
      }

      const payments = await query.orderBy('company.name', 'ASC').getMany();

      this.logger.debug(`Found ${payments.length} companies accepting PIX`);
      return payments;
    } catch (error) {
      this.logger.error('Error finding companies that accept PIX:', error.message);
      throw error;
    }
  }
}
