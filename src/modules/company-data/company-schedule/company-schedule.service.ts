import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CompanySchedule } from './entities/company-schedule.entity';
import { CompanyScheduleHour } from './entities/company-schedule-hour.entity';
import { Company } from '@/modules/companies/entities/company.entity';
import { User } from '@/modules/users/entities/user.entity';
import { CreateCompanyScheduleInput } from './dto/create-company-schedule.input';
import { UpdateCompanyScheduleInput } from './dto/update-company-schedule.input';
import { CreateScheduleHourInput } from './dto/create-schedule-hour.input';
import { UpdateScheduleHourInput } from './dto/update-schedule-hour.input';
import { RoleType } from '@/modules/auth/entities/role.entity';
import { DayOfWeek } from './enums/day-of-week.enum';
import { ScheduleType } from './enums/schedule-type.enum';

@Injectable()
export class CompanyScheduleService {
  private readonly logger = new Logger(CompanyScheduleService.name);

  constructor(
    @InjectRepository(CompanySchedule)
    private scheduleRepository: Repository<CompanySchedule>,
    @InjectRepository(CompanyScheduleHour)
    private scheduleHourRepository: Repository<CompanyScheduleHour>,
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
        throw new ForbiddenException('Você só pode gerenciar horários da sua própria empresa');
      }
      return company;
    }

    throw new ForbiddenException('Você não tem permissão para gerenciar horários desta empresa');
  }

  private validateScheduleHoursData(scheduleHours: CreateScheduleHourInput[]): void {
    if (!scheduleHours || scheduleHours.length === 0) {
      return;
    }

    scheduleHours.forEach(hour => {
      // Validar horários
      if (!hour.isClosed && !hour.is24Hours && (!hour.openTime || !hour.closeTime)) {
        throw new BadRequestException(
          `Horários de abertura e fechamento são obrigatórios para ${hour.dayOfWeek}`,
        );
      }

      // Validar se horário de abertura é antes do fechamento
      if (hour.openTime && hour.closeTime && hour.openTime >= hour.closeTime) {
        throw new BadRequestException(
          `Horário de abertura deve ser anterior ao de fechamento para ${hour.dayOfWeek}`,
        );
      }

      // Validar intervalo
      if (hour.breakStartTime && hour.breakEndTime) {
        if (hour.breakStartTime >= hour.breakEndTime) {
          throw new BadRequestException(
            `Início do intervalo deve ser anterior ao fim para ${hour.dayOfWeek}`,
          );
        }

        if (hour.openTime && hour.closeTime) {
          if (hour.breakStartTime < hour.openTime || hour.breakEndTime > hour.closeTime) {
            throw new BadRequestException(
              `Intervalo deve estar dentro do horário de funcionamento para ${hour.dayOfWeek}`,
            );
          }
        }
      }

      // Validar datas para horários especiais
      if (hour.scheduleType !== ScheduleType.REGULAR) {
        if (hour.specificDate) {
          const date = new Date(hour.specificDate);
          if (date < new Date()) {
            throw new BadRequestException('Data específica não pode ser no passado');
          }
        }

        if (hour.validFrom && hour.validUntil) {
          if (new Date(hour.validFrom) > new Date(hour.validUntil)) {
            throw new BadRequestException('Data de início deve ser anterior à data de fim');
          }
        }
      }
    });

    // Verificar duplicatas para horários regulares
    const regularHours = scheduleHours.filter(h => h.scheduleType === ScheduleType.REGULAR);
    const dayOfWeekCounts = regularHours.reduce(
      (acc, hour) => {
        acc[hour.dayOfWeek] = (acc[hour.dayOfWeek] || 0) + 1;
        return acc;
      },
      {} as Record<DayOfWeek, number>,
    );

    Object.entries(dayOfWeekCounts).forEach(([day, count]) => {
      if (count > 1) {
        throw new BadRequestException(
          `Múltiplos horários regulares para ${day} não são permitidos`,
        );
      }
    });
  }

  async create(
    companyId: number,
    createScheduleInput: CreateCompanyScheduleInput,
    currentUser: User,
  ): Promise<CompanySchedule> {
    this.logger.debug('=== CREATE COMPANY SCHEDULE ===');
    this.logger.debug('CompanyId:', companyId);
    this.logger.debug('Input:', createScheduleInput);

    try {
      await this.validateCompanyAccess(companyId, currentUser);

      const existing = await this.scheduleRepository.findOne({
        where: { companyId },
      });

      if (existing) {
        throw new BadRequestException(
          'Esta empresa já possui configurações de horário cadastradas',
        );
      }

      if (createScheduleInput.scheduleHours) {
        this.validateScheduleHoursData(createScheduleInput.scheduleHours);
      }

      const { scheduleHours, ...scheduleData } = createScheduleInput;
      const schedule = this.scheduleRepository.create({
        ...scheduleData,
        companyId,
      });

      const savedSchedule = await this.scheduleRepository.save(schedule);

      if (scheduleHours && scheduleHours.length > 0) {
        for (const hourData of scheduleHours) {
          const hour = this.scheduleHourRepository.create({
            ...hourData,
            companyId,
            specificDate: hourData.specificDate ? new Date(hourData.specificDate) : undefined,
            validFrom: hourData.validFrom ? new Date(hourData.validFrom) : undefined,
            validUntil: hourData.validUntil ? new Date(hourData.validUntil) : undefined,
          });
          await this.scheduleHourRepository.save(hour);
        }
      }

      this.logger.debug('Company schedule created successfully:', {
        id: savedSchedule.id,
        companyId: savedSchedule.companyId,
        hoursCount: scheduleHours?.length || 0,
      });

      return this.findOne(savedSchedule.id);
    } catch (error) {
      this.logger.error('Error creating company schedule:', error.message);
      throw error;
    }
  }

  async findAll(): Promise<CompanySchedule[]> {
    this.logger.debug('=== FIND ALL COMPANY SCHEDULES ===');

    try {
      const schedules = await this.scheduleRepository.find({
        relations: {
          company: {
            place: true,
            segment: true,
            category: true,
            subcategory: true,
          },
          scheduleHours: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });

      this.logger.debug(`Found ${schedules.length} company schedules`);
      return schedules;
    } catch (error) {
      this.logger.error('Error finding all company schedules:', error.message);
      throw error;
    }
  }

  async findOne(id: number): Promise<CompanySchedule> {
    this.logger.debug('=== FIND ONE COMPANY SCHEDULE ===');
    this.logger.debug('ScheduleId:', id);

    try {
      const schedule = await this.scheduleRepository.findOne({
        where: { id },
        relations: {
          company: {
            place: true,
            segment: true,
            category: true,
            subcategory: true,
          },
          scheduleHours: true,
        },
      });

      if (!schedule) {
        throw new NotFoundException(`Configurações de horário com ID ${id} não encontradas`);
      }

      // Ordenar horários por dia da semana e prioridade
      if (schedule.scheduleHours) {
        schedule.scheduleHours.sort((a, b) => {
          const dayOrder = {
            [DayOfWeek.SEGUNDA]: 1,
            [DayOfWeek.TERCA]: 2,
            [DayOfWeek.QUARTA]: 3,
            [DayOfWeek.QUINTA]: 4,
            [DayOfWeek.SEXTA]: 5,
            [DayOfWeek.SABADO]: 6,
            [DayOfWeek.DOMINGO]: 7,
          };

          const dayDiff = dayOrder[a.dayOfWeek] - dayOrder[b.dayOfWeek];
          if (dayDiff !== 0) return dayDiff;

          return b.priority - a.priority; // Prioridade decrescente
        });
      }

      this.logger.debug('Company schedule found:', {
        id: schedule.id,
        companyId: schedule.companyId,
        companyName: schedule.company?.name,
        hoursCount: schedule.scheduleHours?.length || 0,
      });

      return schedule;
    } catch (error) {
      this.logger.error('Error finding company schedule:', error.message);
      throw error;
    }
  }

  async findByCompany(companyId: number): Promise<CompanySchedule | null> {
    this.logger.debug('=== FIND COMPANY SCHEDULE BY COMPANY ===');
    this.logger.debug('CompanyId:', companyId);

    try {
      const schedule = await this.scheduleRepository.findOne({
        where: { companyId },
        relations: {
          company: {
            place: true,
            segment: true,
            category: true,
            subcategory: true,
          },
          scheduleHours: true,
        },
      });

      if (schedule && schedule.scheduleHours) {
        // Ordenar horários
        schedule.scheduleHours.sort((a, b) => {
          const dayOrder = {
            [DayOfWeek.SEGUNDA]: 1,
            [DayOfWeek.TERCA]: 2,
            [DayOfWeek.QUARTA]: 3,
            [DayOfWeek.QUINTA]: 4,
            [DayOfWeek.SEXTA]: 5,
            [DayOfWeek.SABADO]: 6,
            [DayOfWeek.DOMINGO]: 7,
          };

          const dayDiff = dayOrder[a.dayOfWeek] - dayOrder[b.dayOfWeek];
          if (dayDiff !== 0) return dayDiff;

          return b.priority - a.priority;
        });
      }

      if (schedule) {
        this.logger.debug('Company schedule found for company:', {
          id: schedule.id,
          companyId: schedule.companyId,
          companyName: schedule.company?.name,
          hoursCount: schedule.scheduleHours?.length || 0,
        });
      } else {
        this.logger.debug('No schedule found for company:', companyId);
      }

      return schedule;
    } catch (error) {
      this.logger.error('Error finding company schedule by company:', error.message);
      throw error;
    }
  }

  // Método para verificar se empresa está aberta agora
  async isCompanyOpenNow(companyId: number): Promise<{
    isOpen: boolean;
    currentStatus: string;
    nextOpenTime?: string;
    todaySchedule?: CompanyScheduleHour;
  }> {
    this.logger.debug('=== CHECK IF COMPANY IS OPEN NOW ===');
    this.logger.debug('CompanyId:', companyId);

    try {
      const schedule = await this.findByCompany(companyId);

      if (!schedule || !schedule.isEnabled) {
        return {
          isOpen: false,
          currentStatus: 'Horários não configurados',
        };
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM

      // Mapear dia da semana atual
      const dayNames = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];
      const currentDayOfWeek = dayNames[now.getDay()] as DayOfWeek;

      // Buscar horário específico para hoje (feriados, eventos especiais)
      let todaySchedule = schedule.scheduleHours?.find(
        hour =>
          hour.specificDate &&
          hour.specificDate.toISOString().split('T')[0] === today &&
          hour.scheduleType !== ScheduleType.REGULAR,
      );

      // Se não há horário específico, buscar horário regular
      if (!todaySchedule) {
        todaySchedule = schedule.scheduleHours?.find(
          hour =>
            hour.dayOfWeek === currentDayOfWeek &&
            hour.scheduleType === ScheduleType.REGULAR &&
            (!hour.validFrom || new Date(hour.validFrom) <= now) &&
            (!hour.validUntil || new Date(hour.validUntil) >= now),
        );
      }

      if (!todaySchedule) {
        return {
          isOpen: false,
          currentStatus: 'Fechado hoje',
        };
      }

      // Verificar se está fechado
      if (todaySchedule.isClosed) {
        let message = 'Fechado';
        if (todaySchedule.scheduleType === ScheduleType.HOLIDAY) {
          message = schedule.holidayMessage || 'Fechado - Feriado';
        } else if (todaySchedule.scheduleType === ScheduleType.VACATION) {
          message = 'Fechado - Férias';
        } else if (todaySchedule.scheduleType === ScheduleType.TEMPORARY_CLOSURE) {
          message = 'Fechado temporariamente';
        }

        return {
          isOpen: false,
          currentStatus: message,
          todaySchedule,
        };
      }

      // Verificar se é 24 horas
      if (todaySchedule.is24Hours) {
        return {
          isOpen: true,
          currentStatus: 'Aberto 24 horas',
          todaySchedule,
        };
      }

      // Verificar horário normal
      const openTime = todaySchedule.openTime;
      const closeTime = todaySchedule.closeTime;

      if (!openTime || !closeTime) {
        return {
          isOpen: false,
          currentStatus: 'Horário não definido',
          todaySchedule,
        };
      }

      const isAfterOpen = currentTime >= openTime;
      const isBeforeClose = currentTime < closeTime;
      let isInBreak = false;

      // Verificar se está no intervalo (almoço)
      if (todaySchedule.breakStartTime && todaySchedule.breakEndTime) {
        isInBreak =
          currentTime >= todaySchedule.breakStartTime && currentTime < todaySchedule.breakEndTime;
      }

      if (isAfterOpen && isBeforeClose && !isInBreak) {
        return {
          isOpen: true,
          currentStatus: `Aberto até ${closeTime}`,
          todaySchedule,
        };
      } else if (isInBreak) {
        return {
          isOpen: false,
          currentStatus: `Fechado para almoço - Reabre às ${todaySchedule.breakEndTime}`,
          todaySchedule,
        };
      } else if (!isAfterOpen) {
        return {
          isOpen: false,
          currentStatus: `Fechado - Abre às ${openTime}`,
          nextOpenTime: openTime,
          todaySchedule,
        };
      } else {
        // Buscar próximo dia de funcionamento
        const nextOpenTime = await this.getNextOpenTime(companyId);
        return {
          isOpen: false,
          currentStatus: 'Fechado',
          nextOpenTime,
          todaySchedule,
        };
      }
    } catch (error) {
      this.logger.error('Error checking if company is open:', error.message);
      return {
        isOpen: false,
        currentStatus: 'Erro ao verificar horário',
      };
    }
  }

  private async getNextOpenTime(companyId: number): Promise<string | undefined> {
    try {
      const schedule = await this.findByCompany(companyId);
      if (!schedule || !schedule.scheduleHours) return undefined;

      const now = new Date();
      const dayNames = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];

      // Verificar próximos 7 dias
      for (let i = 1; i <= 7; i++) {
        const nextDate = new Date(now);
        nextDate.setDate(now.getDate() + i);
        const nextDay = dayNames[nextDate.getDay()] as DayOfWeek;
        const nextDateStr = nextDate.toISOString().split('T')[0];

        // Buscar horário específico para esta data
        let daySchedule = schedule.scheduleHours.find(
          hour =>
            hour.specificDate && hour.specificDate.toISOString().split('T')[0] === nextDateStr,
        );

        // Se não há horário específico, buscar horário regular
        if (!daySchedule) {
          daySchedule = schedule.scheduleHours.find(
            hour => hour.dayOfWeek === nextDay && hour.scheduleType === ScheduleType.REGULAR,
          );
        }

        if (daySchedule && !daySchedule.isClosed && daySchedule.openTime) {
          const dayName = this.getDayName(nextDay);
          return `${dayName} às ${daySchedule.openTime}`;
        }
      }

      return undefined;
    } catch (error) {
      this.logger.error('Error getting next open time:', error.message);
      return undefined;
    }
  }

  private getDayName(dayOfWeek: DayOfWeek): string {
    const dayNames = {
      [DayOfWeek.SEGUNDA]: 'Segunda-feira',
      [DayOfWeek.TERCA]: 'Terça-feira',
      [DayOfWeek.QUARTA]: 'Quarta-feira',
      [DayOfWeek.QUINTA]: 'Quinta-feira',
      [DayOfWeek.SEXTA]: 'Sexta-feira',
      [DayOfWeek.SABADO]: 'Sábado',
      [DayOfWeek.DOMINGO]: 'Domingo',
    };
    return dayNames[dayOfWeek];
  }

  async update(
    id: number,
    updateScheduleInput: UpdateCompanyScheduleInput,
    currentUser: User,
  ): Promise<CompanySchedule> {
    this.logger.debug('=== UPDATE COMPANY SCHEDULE ===');
    this.logger.debug('ScheduleId:', id);
    this.logger.debug('Input:', updateScheduleInput);

    try {
      const schedule = await this.findOne(id);
      await this.validateCompanyAccess(schedule.companyId, currentUser);

      const { scheduleHours, ...updateData } = updateScheduleInput;
      const filteredUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([key, value]) => key !== 'id' && value !== undefined),
      );

      if (Object.keys(filteredUpdateData).length === 0 && !scheduleHours) {
        throw new BadRequestException('Nenhum campo válido para atualização foi fornecido');
      }

      if (Object.keys(filteredUpdateData).length > 0) {
        await this.scheduleRepository.update(id, filteredUpdateData);
      }

      if (scheduleHours) {
        this.validateScheduleHoursData(scheduleHours);

        // Remover horários existentes
        await this.scheduleHourRepository.delete({ companyId: schedule.companyId });

        // Criar novos horários
        for (const hourData of scheduleHours) {
          const hour = this.scheduleHourRepository.create({
            ...hourData,
            companyId: schedule.companyId,
            specificDate: hourData.specificDate ? new Date(hourData.specificDate) : undefined,
            validFrom: hourData.validFrom ? new Date(hourData.validFrom) : undefined,
            validUntil: hourData.validUntil ? new Date(hourData.validUntil) : undefined,
          });
          await this.scheduleHourRepository.save(hour);
        }
      }

      this.logger.debug('Company schedule updated successfully');
      return this.findOne(id);
    } catch (error) {
      this.logger.error('Error updating company schedule:', error.message);
      throw error;
    }
  }

  async remove(id: number, currentUser: User): Promise<void> {
    this.logger.debug('=== REMOVE COMPANY SCHEDULE ===');
    this.logger.debug('ScheduleId:', id);

    try {
      const schedule = await this.findOne(id);
      await this.validateCompanyAccess(schedule.companyId, currentUser);

      await this.scheduleRepository.remove(schedule);
      this.logger.debug('Company schedule removed successfully');
    } catch (error) {
      this.logger.error('Error removing company schedule:', error.message);
      throw error;
    }
  }

  // Métodos específicos para horários individuais

  async addScheduleHour(
    companyId: number,
    hourData: CreateScheduleHourInput,
    currentUser: User,
  ): Promise<CompanyScheduleHour> {
    this.logger.debug('=== ADD SCHEDULE HOUR ===');
    this.logger.debug('CompanyId:', companyId);
    this.logger.debug('HourData:', hourData);

    try {
      await this.validateCompanyAccess(companyId, currentUser);

      // Verificar se já existe horário regular para este dia
      if (hourData.scheduleType === ScheduleType.REGULAR) {
        const existing = await this.scheduleHourRepository.findOne({
          where: {
            companyId,
            dayOfWeek: hourData.dayOfWeek,
            scheduleType: ScheduleType.REGULAR,
          },
        });

        if (existing) {
          throw new BadRequestException(`Já existe horário regular para ${hourData.dayOfWeek}`);
        }
      }

      this.validateScheduleHoursData([hourData]);

      const hour = this.scheduleHourRepository.create({
        ...hourData,
        companyId,
        specificDate: hourData.specificDate ? new Date(hourData.specificDate) : undefined,
        validFrom: hourData.validFrom ? new Date(hourData.validFrom) : undefined,
        validUntil: hourData.validUntil ? new Date(hourData.validUntil) : undefined,
      });

      const savedHour = await this.scheduleHourRepository.save(hour);

      this.logger.debug('Schedule hour added successfully:', {
        id: savedHour.id,
        dayOfWeek: savedHour.dayOfWeek,
        scheduleType: savedHour.scheduleType,
      });

      return savedHour;
    } catch (error) {
      this.logger.error('Error adding schedule hour:', error.message);
      throw error;
    }
  }

  async updateScheduleHour(
    id: number,
    updateHourInput: UpdateScheduleHourInput,
    currentUser: User,
  ): Promise<CompanyScheduleHour> {
    this.logger.debug('=== UPDATE SCHEDULE HOUR ===');
    this.logger.debug('HourId:', id);
    this.logger.debug('Input:', updateHourInput);

    try {
      const hour = await this.scheduleHourRepository.findOne({
        where: { id },
        relations: ['company'],
      });

      if (!hour) {
        throw new NotFoundException(`Horário com ID ${id} não encontrado`);
      }

      await this.validateCompanyAccess(hour.companyId, currentUser);

      const updateData = Object.fromEntries(
        Object.entries(updateHourInput).filter(
          ([key, value]) => key !== 'id' && value !== undefined,
        ),
      );

      if (Object.keys(updateData).length === 0) {
        throw new BadRequestException('Nenhum campo válido para atualização foi fornecido');
      }

      // Validar dados atualizados
      const mergedData = { ...hour, ...updateData } as CreateScheduleHourInput;
      this.validateScheduleHoursData([mergedData]);

      // Converter datas se necessário
      if (updateData.specificDate) {
        updateData.specificDate = new Date(updateData.specificDate);
      }
      if (updateData.validFrom) {
        updateData.validFrom = new Date(updateData.validFrom);
      }
      if (updateData.validUntil) {
        updateData.validUntil = new Date(updateData.validUntil);
      }

      await this.scheduleHourRepository.update(id, updateData);

      const updatedHour = await this.scheduleHourRepository.findOne({
        where: { id },
        relations: ['company'],
      });

      this.logger.debug('Schedule hour updated successfully');
      return updatedHour!;
    } catch (error) {
      this.logger.error('Error updating schedule hour:', error.message);
      throw error;
    }
  }

  async removeScheduleHour(id: number, currentUser: User): Promise<void> {
    this.logger.debug('=== REMOVE SCHEDULE HOUR ===');
    this.logger.debug('HourId:', id);

    try {
      const hour = await this.scheduleHourRepository.findOne({
        where: { id },
        relations: ['company'],
      });

      if (!hour) {
        throw new NotFoundException(`Horário com ID ${id} não encontrado`);
      }

      await this.validateCompanyAccess(hour.companyId, currentUser);

      await this.scheduleHourRepository.remove(hour);
      this.logger.debug('Schedule hour removed successfully');
    } catch (error) {
      this.logger.error('Error removing schedule hour:', error.message);
      throw error;
    }
  }

  // Métodos de conveniência para busca por contexto

  async findByPlace(placeId: number): Promise<CompanySchedule[]> {
    this.logger.debug('=== FIND COMPANY SCHEDULES BY PLACE ===');
    this.logger.debug('PlaceId:', placeId);

    try {
      const schedules = await this.scheduleRepository
        .createQueryBuilder('schedule')
        .leftJoinAndSelect('schedule.company', 'company')
        .leftJoinAndSelect('company.place', 'place')
        .leftJoinAndSelect('schedule.scheduleHours', 'scheduleHours')
        .where('company.placeId = :placeId', { placeId })
        .orderBy('schedule.createdAt', 'DESC')
        .getMany();

      this.logger.debug(`Found ${schedules.length} company schedules for place ${placeId}`);
      return schedules;
    } catch (error) {
      this.logger.error('Error finding company schedules by place:', error.message);
      throw error;
    }
  }

  async findByUser(user: User): Promise<CompanySchedule[]> {
    this.logger.debug('=== FIND COMPANY SCHEDULES BY USER ===');

    try {
      const userRoles = user.userRoles?.map(ur => ur.role.name) || [];

      if (userRoles.includes(RoleType.SUPER_ADMIN)) {
        return this.findAll();
      }

      if (userRoles.includes(RoleType.PLACE_ADMIN) && user.placeId) {
        return this.findByPlace(user.placeId);
      }

      if (user.companyId) {
        const schedule = await this.findByCompany(user.companyId);
        return schedule ? [schedule] : [];
      }

      return [];
    } catch (error) {
      this.logger.error('Error finding company schedules by user:', error.message);
      throw error;
    }
  }

  // Método para criar/atualizar em uma operação (upsert)
  async upsert(
    companyId: number,
    scheduleData: CreateCompanyScheduleInput,
    currentUser: User,
  ): Promise<CompanySchedule> {
    this.logger.debug('=== UPSERT COMPANY SCHEDULE ===');
    this.logger.debug('CompanyId:', companyId);

    try {
      await this.validateCompanyAccess(companyId, currentUser);

      const existing = await this.findByCompany(companyId);

      if (existing) {
        const updateInput: UpdateCompanyScheduleInput = {
          id: existing.id,
          ...scheduleData,
        };
        return this.update(existing.id, updateInput, currentUser);
      } else {
        return this.create(companyId, scheduleData, currentUser);
      }
    } catch (error) {
      this.logger.error('Error upserting company schedule:', error.message);
      throw error;
    }
  }

  // Métodos para relatórios e estatísticas

  async getCompaniesOpenNow(placeId?: number): Promise<
    {
      company: Company;
      status: string;
      opensAt?: string;
      closesAt?: string;
    }[]
  > {
    this.logger.debug('=== GET COMPANIES OPEN NOW ===');
    this.logger.debug('PlaceId filter:', placeId);

    try {
      let companies: Company[];

      if (placeId) {
        const companiesQuery = await this.companyRepository.find({
          where: { placeId },
          relations: ['schedule', 'schedule.scheduleHours'],
        });
        companies = companiesQuery;
      } else {
        companies = await this.companyRepository.find({
          relations: ['schedule', 'schedule.scheduleHours'],
        });
      }

      const results: {
        company: Company;
        status: string;
        opensAt?: string;
        closesAt?: string;
      }[] = [];

      for (const company of companies) {
        const status = await this.isCompanyOpenNow(company.id);
        results.push({
          company,
          status: status.currentStatus,
          opensAt: status.nextOpenTime,
          closesAt: status.todaySchedule?.closeTime,
        });
      }

      const openCompanies = results.filter(r => r.status.includes('Aberto'));
      this.logger.debug(
        `Found ${openCompanies.length} companies open now out of ${results.length} total`,
      );

      return results;
    } catch (error) {
      this.logger.error('Error getting companies open now:', error.message);
      throw error;
    }
  }

  async getScheduleStatistics(placeId?: number): Promise<{
    totalCompanies: number;
    companiesWithSchedule: number;
    companiesOpenNow: number;
    averageOpenHours: number;
    mostCommonOpenTime: string;
    mostCommonCloseTime: string;
  }> {
    this.logger.debug('=== GET SCHEDULE STATISTICS ===');

    try {
      let companies: Company[];

      if (placeId) {
        companies = await this.companyRepository.find({
          where: { placeId },
          relations: ['schedule', 'schedule.scheduleHours'],
        });
      } else {
        companies = await this.companyRepository.find({
          relations: ['schedule', 'schedule.scheduleHours'],
        });
      }

      const totalCompanies = companies.length;
      const companiesWithSchedule = companies.filter(c => c.schedule?.isEnabled).length;

      let companiesOpenNow = 0;
      const openTimes: string[] = [];
      const closeTimes: string[] = [];
      let totalOpenHours = 0;
      let validHours = 0;

      for (const company of companies) {
        if (company.schedule?.isEnabled) {
          const status = await this.isCompanyOpenNow(company.id);
          if (status.isOpen) {
            companiesOpenNow++;
          }

          // Coletar horários regulares
          const regularHours =
            company.schedule.scheduleHours?.filter(
              h => h.scheduleType === ScheduleType.REGULAR && !h.isClosed && !h.is24Hours,
            ) || [];

          for (const hour of regularHours) {
            if (hour.openTime && hour.closeTime) {
              openTimes.push(hour.openTime);
              closeTimes.push(hour.closeTime);

              // Calcular horas de funcionamento
              const [openHour, openMin] = hour.openTime.split(':').map(Number);
              const [closeHour, closeMin] = hour.closeTime.split(':').map(Number);
              const openMinutes = openHour * 60 + openMin;
              const closeMinutes = closeHour * 60 + closeMin;
              const dailyHours = (closeMinutes - openMinutes) / 60;

              if (dailyHours > 0) {
                totalOpenHours += dailyHours;
                validHours++;
              }
            }
          }
        }
      }

      // Calcular horários mais comuns
      const mostCommonOpenTime = this.getMostCommon(openTimes) || '09:00';
      const mostCommonCloseTime = this.getMostCommon(closeTimes) || '18:00';
      const averageOpenHours = validHours > 0 ? totalOpenHours / validHours : 0;

      const statistics = {
        totalCompanies,
        companiesWithSchedule,
        companiesOpenNow,
        averageOpenHours: Math.round(averageOpenHours * 10) / 10,
        mostCommonOpenTime,
        mostCommonCloseTime,
      };

      this.logger.debug('Schedule statistics:', statistics);
      return statistics;
    } catch (error) {
      this.logger.error('Error getting schedule statistics:', error.message);
      throw error;
    }
  }

  private getMostCommon(arr: string[]): string | undefined {
    if (arr.length === 0) return undefined;

    const frequency = arr.reduce(
      (acc, item) => {
        acc[item] = (acc[item] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.keys(frequency).reduce((a, b) => (frequency[a] > frequency[b] ? a : b));
  }
}
