import { Entity, Column, ManyToMany, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';
import { BaseEntity } from '@/modules/common/entities/base.entity';

import { Company } from '../../companies/entities/company.entity';
import { Place } from '../../places/entities/place.entity';
import { Segment } from './segment.entity';
import { Subcategory } from './company-subcategory.entity';

@Entity('category') // IMPORTANTE: Nome explícito da tabela
@ObjectType('Category') // IMPORTANTE: Nome explícito do tipo GraphQL
export class Category extends BaseEntity {
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

  @Column({ type: 'text', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  keywords?: string;

  // Relacionamentos
  @ManyToOne(() => Place, place => place.categories, {
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'placeId' })
  @Field(() => Place)
  place: Place;

  @Column({ type: 'int' })
  @FilterableField()
  @Field()
  placeId: number;

  @ManyToMany(() => Segment, segment => segment.categories, {
    eager: false,
    cascade: false,
  })
  @Field(() => [Segment], { nullable: true })
  segments?: Segment[];

  @OneToMany(() => Subcategory, subcategory => subcategory.category, {
    cascade: false,
    eager: false,
  })
  @Field(() => [Subcategory], { nullable: true })
  subcategories?: Subcategory[];

  @OneToMany(() => Company, company => company.category, {
    cascade: false,
    eager: false,
  })
  @Field(() => [Company], { nullable: true })
  companies?: Company[];
}
