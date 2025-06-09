// src/modules/companies/entities/company.entity.ts - HIERARQUIA CORRETA
import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';
import { Place } from '../../places/entities/place.entity';
import { User } from '../../users/entities/user.entity';

import { BaseEntity } from '@/modules/common/entities/base.entity';
import { Segment } from '@/modules/segments/entities/segment.entity';
import { Category } from '@/modules/segments/entities/company-category.entity';
import { Subcategory } from '@/modules/segments/entities/company-subcategory.entity';

@Entity()
@ObjectType()
export class Company extends BaseEntity {
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
  phone?: string;

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  website?: string;

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  address?: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  @FilterableField({ nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  @FilterableField({ nullable: true })
  longitude?: number;

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  openingHours?: string;

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  logo?: string;

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  banner?: string;

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  cnpj?: string; // Brazilian company identification

  // Relacionamentos básicos
  @ManyToOne(() => Place, place => place.companies)
  @JoinColumn({ name: 'placeId' })
  @Field(() => Place)
  place: Place;

  @Column()
  @FilterableField()
  placeId: number;

  @OneToMany(() => User, user => user.company)
  @Field(() => [User], { nullable: true })
  users?: User[];

  // HIERARQUIA DE SEGMENTAÇÃO CORRETA
  // Cada empresa DEVE ter: Segmento → Categoria → Subcategoria

  // 1. SEGMENTO (obrigatório)
  @ManyToOne(() => Segment, segment => segment.companies, {
    nullable: false, // OBRIGATÓRIO
    eager: false,
  })
  @JoinColumn({ name: 'segmentId' })
  @Field(() => Segment)
  segment: Segment;

  @Column()
  @FilterableField()
  segmentId: number;

  // 2. CATEGORIA (obrigatório, deve pertencer ao segmento)
  @ManyToOne(() => Category, category => category.companies, {
    nullable: false, // OBRIGATÓRIO
    eager: false,
  })
  @JoinColumn({ name: 'categoryId' })
  @Field(() => Category)
  category: Category;

  @Column()
  @FilterableField()
  categoryId: number;

  // 3. SUBCATEGORIA (obrigatório, deve pertencer à categoria)
  @ManyToOne(() => Subcategory, subcategory => subcategory.companies, {
    nullable: false, // OBRIGATÓRIO
    eager: false,
  })
  @JoinColumn({ name: 'subcategoryId' })
  @Field(() => Subcategory)
  subcategory: Subcategory;

  @Column()
  @FilterableField()
  subcategoryId: number;

  // Tags para busca adicional (opcional)
  @Column({ nullable: true, type: 'text' })
  @FilterableField({ nullable: true })
  tags?: string; // Tags separadas por vírgula para facilitar buscas
}
