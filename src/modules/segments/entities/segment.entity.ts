import { Entity, Column, ManyToMany, ManyToOne, JoinTable, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';
import { BaseEntity } from '@/modules/common/entities/base.entity';

import { Place } from '../../places/entities/place.entity';
import { Category } from './company-category.entity';

@Entity('segment') // IMPORTANTE: Nome explícito da tabela
@ObjectType('Segment') // IMPORTANTE: Nome explícito do tipo GraphQL
export class Segment extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  @FilterableField()
  @Field() // DUPLA DECORAÇÃO PARA GARANTIR
  name: string;

  @Column({ type: 'varchar', length: 255, unique: false })
  @FilterableField()
  @Field()
  slug: string;

  @Column({ type: 'text' })
  @FilterableField()
  @Field()
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  icon?: string;

  @Column({ type: 'varchar', length: 7, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  color?: string;

  @Column({ type: 'int', default: 0 })
  @FilterableField()
  @Field()
  order: number;

  // Relacionamentos
  @ManyToOne(() => Place, place => place.segments, {
    eager: false, // NÃO carregar automaticamente
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'placeId' })
  @Field(() => Place)
  place: Place;

  @Column({ type: 'int' })
  @FilterableField()
  @Field()
  placeId: number;

  @ManyToMany(() => Category, category => category.segments, {
    cascade: false, // Evitar problemas de cascata
    eager: false,
  })
  @JoinTable({
    name: 'segment_categories',
    joinColumn: { name: 'segmentId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' },
  })
  @Field(() => [Category], { nullable: true })
  categories?: Category[];
}
