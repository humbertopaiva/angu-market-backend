// src/modules/company-data/company-delivery/entities/company-delivery.entity.ts
import { Entity, Column, OneToOne, OneToMany, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';
import { BaseEntity } from '@/modules/common/entities/base.entity';
import { Company } from '@/modules/companies/entities/company.entity';
import { DeliveryZone } from './delivery-zone.entity';
import { DeliveryType } from '../enums/delivery-type.enum';

@Entity('company_delivery')
@ObjectType('CompanyDelivery')
export class CompanyDelivery extends BaseEntity {
  // Configurações gerais de delivery
  @Column({ type: 'boolean', default: false })
  @FilterableField()
  @Field()
  isEnabled: boolean;

  @Column({
    type: 'enum',
    enum: DeliveryType,
    array: true,
    default: [],
  })
  @FilterableField(() => [DeliveryType])
  @Field(() => [DeliveryType])
  availableTypes: DeliveryType[];

  // Configurações de taxa - simplificado para taxa fixa ou gratuita
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  @FilterableField()
  @Field()
  baseFee: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  freeDeliveryMinValue?: number; // Valor mínimo para entrega grátis

  // Configurações de tempo
  @Column({ type: 'int', default: 30 })
  @FilterableField()
  @Field()
  estimatedTimeMinutes: number;

  @Column({ type: 'int', default: 15 })
  @FilterableField()
  @Field()
  pickupTimeMinutes: number; // Tempo para retirada

  // Configurações de pedido
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  minimumOrderValue?: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  maximumOrderValue?: number;

  // Configurações de pagamento
  @Column({ type: 'boolean', default: true })
  @FilterableField()
  @Field()
  acceptsCash: boolean;

  @Column({ type: 'boolean', default: true })
  @FilterableField()
  @Field()
  acceptsCard: boolean;

  @Column({ type: 'boolean', default: true })
  @FilterableField()
  @Field()
  acceptsPix: boolean;

  // Informações adicionais
  @Column({ type: 'text', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  deliveryInstructions?: string;

  @Column({ type: 'text', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  pickupInstructions?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  deliveryPhone?: string; // Telefone específico para delivery

  @Column({ type: 'varchar', length: 500, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  deliveryWhatsApp?: string; // WhatsApp específico para delivery

  // Relacionamento ONE-TO-ONE com Company
  @OneToOne(() => Company, company => company.delivery, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  @Field(() => Company)
  company: Company;

  @Column({ unique: true })
  @FilterableField()
  @Field()
  companyId: number;

  // Relacionamento ONE-TO-MANY com zonas de entrega
  @OneToMany(() => DeliveryZone, deliveryZone => deliveryZone.company, {
    cascade: ['insert', 'update', 'remove'],
    eager: false,
  })
  @Field(() => [DeliveryZone], { nullable: true })
  deliveryZones?: DeliveryZone[];
}