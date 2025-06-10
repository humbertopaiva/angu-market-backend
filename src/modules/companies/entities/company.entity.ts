// src/modules/companies/entities/company.entity.ts - COMPLETO COM TODOS OS RELACIONAMENTOS
import { Entity, Column, ManyToOne, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';
import { BaseEntity } from '@/modules/common/entities/base.entity';

// Relacionamentos básicos
import { Place } from '../../places/entities/place.entity';
import { User } from '../../users/entities/user.entity';

// Hierarquia de segmentação
import { Segment } from '@/modules/segments/entities/segment.entity';
import { Category } from '@/modules/segments/entities/company-category.entity';
import { Subcategory } from '@/modules/segments/entities/company-subcategory.entity';

// Company Data - Submódulos
import { CompanyBasicInfo } from '@/modules/company-data/company-basic-info/entities/company-basic-info.entity';
import { CompanyPayments } from '@/modules/company-data/company-payments/entities/company-payments.entity';
import { CompanySocials } from '@/modules/company-data/company-socials/entities/company-socials.entity';
import { CompanySocial } from '@/modules/company-data/company-socials/entities/company-social.entity';

@Entity()
@ObjectType()
export class Company extends BaseEntity {
  // ===== CAMPOS BÁSICOS DA EMPRESA =====

  @Column()
  @FilterableField()
  name: string;

  @Column()
  @FilterableField()
  slug: string;

  @Column()
  @FilterableField()
  description: string;

  // Campos de contato básicos (podem ser complementados pelo CompanyBasicInfo)
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

  // Localização geográfica
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  @FilterableField({ nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  @FilterableField({ nullable: true })
  longitude?: number;

  // Informações operacionais básicas
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

  // ===== RELACIONAMENTOS BÁSICOS =====

  // Relacionamento com Place (obrigatório)
  @ManyToOne(() => Place, place => place.companies, {
    nullable: false,
    eager: false,
  })
  @JoinColumn({ name: 'placeId' })
  @Field(() => Place)
  place: Place;

  @Column()
  @FilterableField()
  placeId: number;

  // Relacionamento com Users (funcionários da empresa)
  @OneToMany(() => User, user => user.company, {
    cascade: false,
    eager: false,
  })
  @Field(() => [User], { nullable: true })
  users?: User[];

  // ===== HIERARQUIA DE SEGMENTAÇÃO (OBRIGATÓRIA) =====
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

  // ===== COMPANY DATA - SUBMÓDULOS =====

  // 1. INFORMAÇÕES BÁSICAS (ONE-TO-ONE)
  @OneToOne(() => CompanyBasicInfo, basicInfo => basicInfo.company, {
    cascade: ['insert', 'update'],
    eager: false,
  })
  @Field(() => CompanyBasicInfo, { nullable: true })
  basicInfo?: CompanyBasicInfo;

  // 2. MÉTODOS DE PAGAMENTO (ONE-TO-ONE)
  @OneToOne(() => CompanyPayments, payments => payments.company, {
    cascade: ['insert', 'update'],
    eager: false,
  })
  @Field(() => CompanyPayments, { nullable: true })
  payments?: CompanyPayments;

  // 3. REDES SOCIAIS - CONFIGURAÇÕES GERAIS (ONE-TO-ONE)
  @OneToOne(() => CompanySocials, socials => socials.company, {
    cascade: ['insert', 'update'],
    eager: false,
  })
  @Field(() => CompanySocials, { nullable: true })
  socials?: CompanySocials;

  // 4. REDES SOCIAIS - INDIVIDUAIS (ONE-TO-MANY)
  // Relacionamento direto com redes sociais individuais para facilitar queries
  @OneToMany(() => CompanySocial, social => social.company, {
    cascade: ['insert', 'update', 'remove'],
    eager: false,
  })
  @Field(() => [CompanySocial], { nullable: true })
  socialNetworks?: CompanySocial[];

  // ===== FUTUROS SUBMÓDULOS =====
  // Quando implementados, adicionar aqui:

  // 5. HORÁRIOS DE FUNCIONAMENTO
  // @OneToOne(() => CompanySchedule, schedule => schedule.company, {
  //   cascade: ['insert', 'update'],
  //   eager: false,
  // })
  // @Field(() => CompanySchedule, { nullable: true })
  // schedule?: CompanySchedule;

  // 6. CONFIGURAÇÕES DE DELIVERY
  // @OneToOne(() => CompanyDelivery, delivery => delivery.company, {
  //   cascade: ['insert', 'update'],
  //   eager: false,
  // })
  // @Field(() => CompanyDelivery, { nullable: true })
  // delivery?: CompanyDelivery;

  // 9. GALERIA DE FOTOS
  // @OneToMany(() => CompanyPhoto, photo => photo.company, {
  //   cascade: ['insert', 'update', 'remove'],
  //   eager: false,
  // })
  // @Field(() => [CompanyPhoto], { nullable: true })
  // photos?: CompanyPhoto[];
}
