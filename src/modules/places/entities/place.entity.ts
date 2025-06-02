import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';

import { Organization } from '../../organizations/entities/organization.entity';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';
import { Segment } from '../../segments/entities/segment.entity';

import { BaseEntity } from '@/modules/common/entities/base.entity';
import { Category } from '@/modules/segments/entities/company-category.entity';
import { Subcategory } from '@/modules/segments/entities/company-subcategory.entity';

@Entity()
@ObjectType()
export class Place extends BaseEntity {
  @Column()
  @FilterableField()
  name: string;

  @Column({ unique: true })
  @FilterableField()
  slug: string;

  @Column()
  @FilterableField()
  description: string;

  @Column()
  @FilterableField()
  city: string;

  @Column()
  @FilterableField()
  state: string;

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  neighborhood?: string;

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  postalCode?: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  @FilterableField({ nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  @FilterableField({ nullable: true })
  longitude?: number;

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  logo?: string;

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  banner?: string;

  // Relacionamentos
  @ManyToOne(() => Organization, organization => organization.places)
  @JoinColumn({ name: 'organizationId' })
  @Field(() => Organization)
  organization: Organization;

  @Column()
  @FilterableField()
  organizationId: number;

  @OneToMany(() => Company, company => company.place)
  @Field(() => [Company], { nullable: true })
  companies?: Company[];

  @OneToMany(() => User, user => user.place)
  @Field(() => [User], { nullable: true })
  users?: User[];

  // Novos relacionamentos para categorização
  @OneToMany(() => Segment, segment => segment.place)
  @Field(() => [Segment], { nullable: true })
  segments?: Segment[];

  @OneToMany(() => Category, category => category.place)
  @Field(() => [Category], { nullable: true })
  categories?: Category[];

  @OneToMany(() => Subcategory, subcategory => subcategory.place)
  @Field(() => [Subcategory], { nullable: true })
  subcategories?: Subcategory[];
}
