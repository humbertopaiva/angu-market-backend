import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';
import { BaseEntity } from '@/modules/common/entities/base.entity';

import { Company } from '../../companies/entities/company.entity';
import { Place } from '../../places/entities/place.entity';
import { Category } from './company-category.entity';

@Entity('subcategory') // IMPORTANTE: Nome explícito da tabela
@ObjectType('Subcategory') // IMPORTANTE: Nome explícito do tipo GraphQL
export class Subcategory extends BaseEntity {
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

  @Column({ type: 'int', default: 0 })
  @FilterableField()
  @Field()
  order: number;

  @Column({ type: 'text', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  keywords?: string;

  // Relacionamentos
  @ManyToOne(() => Place, place => place.subcategories, {
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

  @ManyToOne(() => Category, category => category.subcategories, {
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'categoryId' })
  @Field(() => Category)
  category: Category;

  @Column({ type: 'int' })
  @FilterableField()
  @Field()
  categoryId: number;

  @OneToMany(() => Company, company => company.subcategory, {
    cascade: false,
    eager: false,
  })
  @Field(() => [Company], { nullable: true })
  companies?: Company[];
}
