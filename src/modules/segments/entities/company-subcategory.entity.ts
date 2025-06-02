import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';
import { BaseEntity } from '@/modules/common/entities/base.entity';

import { Company } from '../../companies/entities/company.entity';
import { Place } from '../../places/entities/place.entity';
import { Category } from './company-category.entity';

@Entity()
@ObjectType()
export class Subcategory extends BaseEntity {
  @Column()
  @FilterableField()
  name: string;

  @Column()
  @FilterableField()
  slug: string;

  @Column()
  @FilterableField()
  description: string;

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  icon?: string; // Ícone da subcategoria

  @Column({ default: 0 })
  @FilterableField()
  order: number; // Ordem de exibição

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  keywords?: string; // Palavras-chave para busca (separadas por vírgula)

  // Relacionamentos
  @ManyToOne(() => Place, place => place.subcategories)
  @JoinColumn({ name: 'placeId' })
  @Field(() => Place)
  place: Place;

  @Column()
  @FilterableField()
  placeId: number;

  @ManyToOne(() => Category, category => category.subcategories)
  @JoinColumn({ name: 'categoryId' })
  @Field(() => Category)
  category: Category;

  @Column()
  @FilterableField()
  categoryId: number;

  @OneToMany(() => Company, company => company.subcategory)
  @Field(() => [Company], { nullable: true })
  companies?: Company[];
}
