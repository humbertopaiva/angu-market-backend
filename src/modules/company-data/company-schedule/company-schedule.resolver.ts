import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';

import { CompanyScheduleService } from './company-schedule.service';
import { CompanySchedule } from './entities/company-schedule.entity';
import { CompanyScheduleHour } from './entities/company-schedule-hour.entity';
import { CreateCompanyScheduleInput } from './dto/create-company-schedule.input';
import { UpdateCompanyScheduleInput } from './dto/update-company-schedule.input';
import { CreateScheduleHourInput } from './dto/create-schedule-hour.input';
import { UpdateScheduleHourInput } from './dto/update-schedule-hour.input';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RoleType } from '@/modules/auth/entities/role.entity';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';

@Resolver(() => CompanySchedule)
export class CompanyScheduleResolver {
  private readonly logger = new Logger(CompanyScheduleResolver.name);

  constructor(private readonly scheduleService: CompanyScheduleService) {}

  // ===== COMPANY SCHEDULE (AGREGADOR) =====

  /**
   * Criar configurações de horário da empresa
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN, COMPANY_STAFF
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => CompanySchedule)
  async createCompanySchedule(
    @Args('companyId', { type: () => Int }) companyId: number,
    @Args('createScheduleInput') createScheduleInput: CreateCompanyScheduleInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('=== CREATE COMPANY SCHEDULE RESOLVER ===');
    this.logger.debug('CompanyId:', companyId);
    this.logger.debug('Input:', createScheduleInput);

    try {
      const result = await this.scheduleService.create(companyId, createScheduleInput, currentUser);
      this.logger.debug('Company schedule created successfully');
      return result;
    } catch (error) {
      this.logger.error('Error creating company schedule:', error.message);
      throw error;
    }
  }

  /**
   * Listar todas as configurações de horário
   * Permitido: SUPER_ADMIN, PLACE_ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Query(() => [CompanySchedule], { name: 'allCompanySchedules' })
  findAll() {
    this.logger.debug('Finding all company schedules');
    return this.scheduleService.findAll();
  }

  /**
   * Buscar configurações de horário do usuário logado
   * Requer autenticação
   */
  @UseGuards(JwtAuthGuard)
  @Query(() => [CompanySchedule], { name: 'myCompanySchedules' })
  findByCurrentUser(@CurrentUser() currentUser: User) {
    this.logger.debug('Finding company schedules for current user:', {
      id: currentUser?.id,
      email: currentUser?.email,
    });
    return this.scheduleService.findByUser(currentUser);
  }

  /**
   * Buscar configurações de horário por ID
   * Público (sem autenticação) - para exibição de horários
   */
  @Query(() => CompanySchedule, { name: 'companySchedule' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    this.logger.debug('Finding company schedule by ID:', id);
    return this.scheduleService.findOne(id);
  }

  /**
   * Buscar configurações de horário por empresa
   * Público (sem autenticação) - para exibição de horários
   */
  @Query(() => CompanySchedule, { name: 'companyScheduleByCompany', nullable: true })
  findByCompany(@Args('companyId', { type: () => Int }) companyId: number) {
    this.logger.debug('Finding company schedule by company:', companyId);
    return this.scheduleService.findByCompany(companyId);
  }

  /**
   * Verificar se empresa está aberta agora
   * Público (sem autenticação) - informação útil para clientes
   */
  @Query(() => String, { name: 'isCompanyOpenNow' })
  async isCompanyOpenNow(
    @Args('companyId', { type: () => Int }) companyId: number,
  ): Promise<string> {
    this.logger.debug('Checking if company is open now:', companyId);

    try {
      const result = await this.scheduleService.isCompanyOpenNow(companyId);
      return JSON.stringify(result);
    } catch (error) {
      this.logger.error('Error checking if company is open:', error.message);
      throw error;
    }
  }

  /**
   * Buscar configurações de horário por place
   * Público (sem autenticação) - para listagem pública
   */
  @Query(() => [CompanySchedule], { name: 'companySchedulesByPlace' })
  findByPlace(@Args('placeId', { type: () => Int }) placeId: number) {
    this.logger.debug('Finding company schedules by place:', placeId);
    return this.scheduleService.findByPlace(placeId);
  }

  /**
   * Buscar empresas abertas agora
   * Público (sem autenticação) - para filtros de busca
   */
  @Query(() => String, { name: 'companiesOpenNow' })
  async getCompaniesOpenNow(
    @Args('placeId', { type: () => Int, nullable: true }) placeId?: number,
  ): Promise<string> {
    this.logger.debug('Finding companies open now:', { placeId });

    try {
      const result = await this.scheduleService.getCompaniesOpenNow(placeId);
      return JSON.stringify(result);
    } catch (error) {
      this.logger.error('Error finding companies open now:', error.message);
      throw error;
    }
  }

  /**
   * Obter estatísticas de horários
   * Permitido: SUPER_ADMIN, PLACE_ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN)
  @Query(() => String, { name: 'scheduleStatistics' })
  async getScheduleStatistics(
    @Args('placeId', { type: () => Int, nullable: true }) placeId?: number,
  ): Promise<string> {
    this.logger.debug('Getting schedule statistics:', { placeId });

    try {
      const result = await this.scheduleService.getScheduleStatistics(placeId);
      return JSON.stringify(result);
    } catch (error) {
      this.logger.error('Error getting schedule statistics:', error.message);
      throw error;
    }
  }

  /**
   * Atualizar configurações de horário
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN, COMPANY_STAFF
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => CompanySchedule)
  updateCompanySchedule(
    @Args('updateScheduleInput') updateScheduleInput: UpdateCompanyScheduleInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Updating company schedule:', {
      id: updateScheduleInput.id,
      currentUser: currentUser?.email,
    });
    return this.scheduleService.update(updateScheduleInput.id, updateScheduleInput, currentUser);
  }

  /**
   * Remover configurações de horário
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => Boolean)
  async removeCompanySchedule(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() currentUser: User,
  ): Promise<boolean> {
    this.logger.debug('Removing company schedule:', id);

    try {
      await this.scheduleService.remove(id, currentUser);
      this.logger.debug('Company schedule removed successfully');
      return true;
    } catch (error) {
      this.logger.error('Error removing company schedule:', error.message);
      throw error;
    }
  }

  /**
   * Criar ou atualizar configurações de horário (upsert)
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN, COMPANY_STAFF
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => CompanySchedule)
  async upsertCompanySchedule(
    @Args('companyId', { type: () => Int }) companyId: number,
    @Args('scheduleData') scheduleData: CreateCompanyScheduleInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Upserting company schedule:', { companyId });

    try {
      const result = await this.scheduleService.upsert(companyId, scheduleData, currentUser);
      this.logger.debug('Company schedule upserted successfully');
      return result;
    } catch (error) {
      this.logger.error('Error upserting company schedule:', error.message);
      throw error;
    }
  }

  // ===== HORÁRIOS INDIVIDUAIS =====

  /**
   * Adicionar um horário específico
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN, COMPANY_STAFF
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => CompanyScheduleHour)
  async addScheduleHour(
    @Args('companyId', { type: () => Int }) companyId: number,
    @Args('hourData') hourData: CreateScheduleHourInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Adding schedule hour:', { companyId, dayOfWeek: hourData.dayOfWeek });

    try {
      const result = await this.scheduleService.addScheduleHour(companyId, hourData, currentUser);
      this.logger.debug('Schedule hour added successfully');
      return result;
    } catch (error) {
      this.logger.error('Error adding schedule hour:', error.message);
      throw error;
    }
  }

  /**
   * Atualizar um horário específico
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN, COMPANY_STAFF
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => CompanyScheduleHour)
  updateScheduleHour(
    @Args('updateHourInput') updateHourInput: UpdateScheduleHourInput,
    @CurrentUser() currentUser: User,
  ) {
    this.logger.debug('Updating schedule hour:', {
      id: updateHourInput.id,
      currentUser: currentUser?.email,
    });
    return this.scheduleService.updateScheduleHour(
      updateHourInput.id,
      updateHourInput,
      currentUser,
    );
  }

  /**
   * Remover um horário específico
   * Permitido: SUPER_ADMIN, PLACE_ADMIN, COMPANY_ADMIN, COMPANY_STAFF
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.PLACE_ADMIN, RoleType.COMPANY_ADMIN)
  @Mutation(() => Boolean)
  async removeScheduleHour(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() currentUser: User,
  ): Promise<boolean> {
    this.logger.debug('Removing schedule hour:', id);

    try {
      await this.scheduleService.removeScheduleHour(id, currentUser);
      this.logger.debug('Schedule hour removed successfully');
      return true;
    } catch (error) {
      this.logger.error('Error removing schedule hour:', error.message);
      throw error;
    }
  }
}
