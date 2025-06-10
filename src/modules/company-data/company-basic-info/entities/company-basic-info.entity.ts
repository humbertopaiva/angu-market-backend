import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';
import { BaseEntity } from '@/modules/common/entities/base.entity';
import { Company } from '@/modules/companies/entities/company.entity';

@Entity('company_basic_info')
@ObjectType('CompanyBasicInfo')
export class CompanyBasicInfo extends BaseEntity {
  @Column({ type: 'text', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  whatsapp?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  email?: string;

  @Column({ type: 'text', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  logo?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  banner?: string;

  // Relacionamento ONE-TO-ONE com Company
  @OneToOne(() => Company, company => company.basicInfo, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  @Field(() => Company)
  company: Company;

  @Column({ unique: true })
  @FilterableField()
  @Field()
  companyId: number;
}
