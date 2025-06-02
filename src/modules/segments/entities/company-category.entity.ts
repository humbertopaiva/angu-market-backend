import { Entity, Column, ManyToMany, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';
import { BaseEntity } from '@/modules/common/entities/base.entity';

import { Company } from '../../companies/entities/company.entity';
import { Place } from '../../places/entities/place.entity';
import { Segment } from '@/modules/segments/entities/segment.entity';
import { Subcategory } from '@/modules/segments/entities/company-subcategory.entity';

@Entity()
@ObjectType()
export class Category extends BaseEntity {
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
  icon?: string; // Ícone da categoria

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  color?: string; // Cor tema da categoria

  @Column({ default: 0 })
  @FilterableField()
  order: number; // Ordem de exibição

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  keywords?: string; // Palavras-chave para busca (separadas por vírgula)

  // Relacionamentos
  @ManyToOne(() => Place, place => place.categories)
  @JoinColumn({ name: 'placeId' })
  @Field(() => Place)
  place: Place;

  @Column()
  @FilterableField()
  placeId: number;

  @ManyToMany(() => Segment, segment => segment.categories)
  @Field(() => [Segment], { nullable: true })
  segments?: Segment[];

  @OneToMany(() => Subcategory, subcategory => subcategory.category)
  @Field(() => [Subcategory], { nullable: true })
  subcategories?: Subcategory[];

  @OneToMany(() => Company, company => company.category)
  @Field(() => [Company], { nullable: true })
  companies?: Company[];
}
