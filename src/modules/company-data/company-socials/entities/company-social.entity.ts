import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';
import { BaseEntity } from '@/modules/common/entities/base.entity';
import { Company } from '@/modules/companies/entities/company.entity';
import { SocialNetworkType } from '../enums/social-network.enum';

@Entity('company_social')
@ObjectType('CompanySocial')
@Unique(['companyId', 'networkType']) // Uma empresa não pode ter duas entradas para a mesma rede social
export class CompanySocial extends BaseEntity {
  @Column({
    type: 'enum',
    enum: SocialNetworkType,
  })
  @FilterableField(() => SocialNetworkType)
  @Field(() => SocialNetworkType)
  networkType: SocialNetworkType;

  @Column({ type: 'varchar', length: 500 })
  @FilterableField()
  @Field()
  url: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  username?: string; // @username ou handle da rede social

  @Column({ type: 'varchar', length: 255, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  displayName?: string; // Nome para exibição

  @Column({ type: 'text', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  description?: string; // Descrição ou bio

  @Column({ type: 'boolean', default: true })
  @FilterableField()
  @Field()
  isVisible: boolean; // Se deve ser exibido publicamente

  @Column({ type: 'int', default: 0 })
  @FilterableField()
  @Field()
  displayOrder: number; // Ordem de exibição

  @Column({ type: 'boolean', default: false })
  @FilterableField()
  @Field()
  isPrimary: boolean; // Rede social principal

  // Para redes sociais que permitem métricas públicas
  @Column({ type: 'int', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  followersCount?: number;

  @Column({ type: 'timestamp', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  lastUpdated?: Date; // Última atualização das métricas

  // Relacionamento com Company
  @ManyToOne(() => Company, company => company.socials, {
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
