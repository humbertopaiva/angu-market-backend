// src/modules/company-data/company-delivery/entities/delivery-zone.entity.ts
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';
import { BaseEntity } from '@/modules/common/entities/base.entity';
import { Company } from '@/modules/companies/entities/company.entity';

@Entity('delivery_zone')
@ObjectType('DeliveryZone')
export class DeliveryZone extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  @FilterableField()
  @Field()
  name: string;

  @Column({ type: 'text' })
  @FilterableField()
  @Field()
  neighborhoods: string; // Lista de bairros separados por vírgula

  // Configurações da zona
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  @FilterableField()
  @Field()
  deliveryFee: number;

  @Column({ type: 'int', default: 30 })
  @FilterableField()
  @Field()
  estimatedTimeMinutes: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  minimumOrderValue?: number;

  @Column({ type: 'boolean', default: true })
  @FilterableField()
  @Field()
  isEnabled: boolean;

  @Column({ type: 'int', default: 0 })
  @FilterableField()
  @Field()
  priority: number; // Para ordenação/sobreposição de zonas

  @Column({ type: 'text', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  description?: string;

  // Relacionamento com Company
  @ManyToOne(() => Company, company => company.deliveryZones, {
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