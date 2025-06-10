import { Entity, Column, OneToOne, OneToMany, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';
import { BaseEntity } from '@/modules/common/entities/base.entity';
import { Company } from '@/modules/companies/entities/company.entity';
import { CompanyScheduleHour } from './company-schedule-hour.entity';

@Entity('company_schedule')
@ObjectType('CompanySchedule')
export class CompanySchedule extends BaseEntity {
  // Configurações gerais de horário
  @Column({ type: 'varchar', length: 100, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  timezone?: string; // Fuso horário (ex: 'America/Sao_Paulo')

  @Column({ type: 'boolean', default: true })
  @FilterableField()
  @Field()
  isEnabled: boolean; // Se o sistema de horários está ativo

  @Column({ type: 'boolean', default: false })
  @FilterableField()
  @Field()
  allowOnlineScheduling: boolean; // Se permite agendamento online

  @Column({ type: 'int', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  slotDurationMinutes?: number; // Duração dos slots de agendamento

  @Column({ type: 'int', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  advanceBookingDays?: number; // Quantos dias de antecedência para agendamento

  @Column({ type: 'text', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  scheduleNotes?: string; // Observações gerais sobre horários

  @Column({ type: 'varchar', length: 500, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  holidayMessage?: string; // Mensagem exibida em feriados

  @Column({ type: 'varchar', length: 500, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  closedMessage?: string; // Mensagem exibida quando fechado

  @Column({ type: 'boolean', default: false })
  @FilterableField()
  @Field()
  showNextOpenTime: boolean; // Se deve mostrar próximo horário de funcionamento

  @Column({ type: 'boolean', default: true })
  @FilterableField()
  @Field()
  autoUpdateStatus: boolean; // Se deve atualizar status automaticamente

  // Configurações de delivery/takeout (se aplicável)
  @Column({ type: 'boolean', default: false })
  @FilterableField()
  @Field()
  hasDeliverySchedule: boolean; // Se tem horário diferente para delivery

  @Column({ type: 'boolean', default: false })
  @FilterableField()
  @Field()
  hasTakeoutSchedule: boolean; // Se tem horário diferente para retirada

  // Relacionamento ONE-TO-ONE com Company
  @OneToOne(() => Company, company => company.schedule, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  @Field(() => Company)
  company: Company;

  @Column({ unique: true })
  @FilterableField()
  @Field()
  companyId: number;

  // Relacionamento ONE-TO-MANY com horários específicos
  @OneToMany(() => CompanyScheduleHour, scheduleHour => scheduleHour.company, {
    cascade: ['insert', 'update', 'remove'],
    eager: false,
  })
  @Field(() => [CompanyScheduleHour], { nullable: true })
  scheduleHours?: CompanyScheduleHour[];
}
