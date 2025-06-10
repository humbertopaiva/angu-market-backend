import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';
import { BaseEntity } from '@/modules/common/entities/base.entity';
import { Company } from '@/modules/companies/entities/company.entity';
import { DayOfWeek } from '../enums/day-of-week.enum';
import { ScheduleType } from '../enums/schedule-type.enum';

@Entity('company_schedule_hour')
@ObjectType('CompanyScheduleHour')
export class CompanyScheduleHour extends BaseEntity {
  @Column({
    type: 'enum',
    enum: DayOfWeek,
  })
  @FilterableField(() => DayOfWeek)
  @Field(() => DayOfWeek)
  dayOfWeek: DayOfWeek;

  @Column({
    type: 'enum',
    enum: ScheduleType,
    default: ScheduleType.REGULAR,
  })
  @FilterableField(() => ScheduleType)
  @Field(() => ScheduleType)
  scheduleType: ScheduleType;

  @Column({ type: 'time', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  openTime?: string; // Formato HH:MM

  @Column({ type: 'time', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  closeTime?: string; // Formato HH:MM

  @Column({ type: 'boolean', default: false })
  @FilterableField()
  @Field()
  isClosed: boolean; // Se está fechado neste dia

  @Column({ type: 'boolean', default: false })
  @FilterableField()
  @Field()
  is24Hours: boolean; // Se funciona 24 horas

  @Column({ type: 'time', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  breakStartTime?: string; // Início do intervalo (almoço)

  @Column({ type: 'time', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  breakEndTime?: string; // Fim do intervalo (almoço)

  @Column({ type: 'varchar', length: 500, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  notes?: string; // Observações sobre o horário

  // Para horários especiais, feriados, etc.
  @Column({ type: 'date', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  specificDate?: Date; // Data específica (para feriados, eventos especiais)

  @Column({ type: 'date', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  validFrom?: Date; // Válido a partir de

  @Column({ type: 'date', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  validUntil?: Date; // Válido até

  @Column({ type: 'int', default: 0 })
  @FilterableField()
  @Field()
  priority: number; // Prioridade (horários especiais têm prioridade maior)

  // Relacionamento com Company
  @ManyToOne(() => Company, company => company.scheduleHours, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  @Field(() => Company)
  company: Company;

  @Column()
  @FilterableField()
  @Field()
  companyId: number;
}
