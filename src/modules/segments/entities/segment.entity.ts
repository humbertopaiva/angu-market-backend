import { Entity, Column, ManyToMany, ManyToOne, JoinTable, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';
import { BaseEntity } from '@/modules/common/entities/base.entity';

import { Place } from '../../places/entities/place.entity';
import { Category } from '@/modules/company-categories/entities/company-category.entity';

@Entity()
@ObjectType()
export class Segment extends BaseEntity {
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
  icon?: string; // Ícone do segmento

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  color?: string; // Cor tema do segmento (ex: #FF5722)

  @Column({ default: 0 })
  @FilterableField()
  order: number; // Ordem de exibição

  // Relacionamentos
  @ManyToOne(() => Place, place => place.segments)
  @JoinColumn({ name: 'placeId' })
  @Field(() => Place)
  place: Place;

  @Column()
  @FilterableField()
  placeId: number;

  @ManyToMany(() => Category, category => category.segments, { cascade: true })
  @JoinTable({
    name: 'segment_categories',
    joinColumn: { name: 'segmentId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' },
  })
  @Field(() => [Category], { nullable: true })
  categories?: Category[];
}
