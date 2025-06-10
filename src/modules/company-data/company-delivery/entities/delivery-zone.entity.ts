import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';
import { BaseEntity } from '@/modules/common/entities/base.entity';
import { Company } from '@/modules/companies/entities/company.entity';
import { DeliveryZoneType } from '../enums/delivery-zone-type.enum';

@Entity('delivery_zone')
@ObjectType('DeliveryZone')
export class DeliveryZone extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  @FilterableField()
  @Field()
  name: string;

  @Column({
    type: 'enum',
    enum: DeliveryZoneType,
  })
  @FilterableField(() => DeliveryZoneType)
  @Field(() => DeliveryZoneType)
  zoneType: DeliveryZoneType;

  // Para RADIUS
  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  radiusKm?: number;

  // Para POLYGON (coordenadas GeoJSON)
  @Column({ type: 'json', nullable: true })
  @Field({ nullable: true })
  coordinates?: object; // GeoJSON polygon

  // Para NEIGHBORHOOD
  @Column({ type: 'text', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  neighborhoods?: string; // Lista separada por vírgula

  // Para POSTAL_CODE
  @Column({ type: 'text', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  postalCodes?: string; // Lista separada por vírgula

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

  // Horários específicos da zona (se diferente da empresa)
  @Column({ type: 'json', nullable: true })
  @Field({ nullable: true })
  customSchedule?: object; // JSON com horários específicos

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
