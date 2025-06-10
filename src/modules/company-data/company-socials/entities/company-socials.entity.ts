import { Entity, Column, OneToOne, OneToMany, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';
import { BaseEntity } from '@/modules/common/entities/base.entity';
import { Company } from '@/modules/companies/entities/company.entity';
import { CompanySocial } from './company-social.entity';

@Entity('company_socials')
@ObjectType('CompanySocials')
export class CompanySocials extends BaseEntity {
  // Configurações gerais de redes sociais
  @Column({ type: 'boolean', default: true })
  @FilterableField()
  @Field()
  isEnabled: boolean; // Se a empresa usa redes sociais

  @Column({ type: 'text', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  socialMediaStrategy?: string; // Estratégia ou descrição geral

  @Column({ type: 'varchar', length: 500, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  primaryContactSocial?: string; // Rede social principal para contato

  @Column({ type: 'boolean', default: false })
  @FilterableField()
  @Field()
  showFollowersCount: boolean; // Se deve exibir contadores de seguidores

  @Column({ type: 'boolean', default: true })
  @FilterableField()
  @Field()
  allowMessages: boolean; // Se aceita mensagens via redes sociais

  @Column({ type: 'text', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  socialMediaRules?: string; // Regras para interação em redes sociais

  // Relacionamento ONE-TO-ONE com Company
  @OneToOne(() => Company, company => company.socials, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  @Field(() => Company)
  company: Company;

  @Column({ unique: true })
  @FilterableField()
  @Field()
  companyId: number;

  // Relacionamento ONE-TO-MANY com as redes sociais individuais
  @OneToMany(() => CompanySocial, companySocial => companySocial.company, {
    cascade: ['insert', 'update', 'remove'],
    eager: false,
  })
  @Field(() => [CompanySocial], { nullable: true })
  socialNetworks?: CompanySocial[];
}
