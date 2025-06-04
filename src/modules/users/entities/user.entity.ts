import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';
import { Organization } from '../../organizations/entities/organization.entity';
import { Place } from '../../places/entities/place.entity';
import { Company } from '../../companies/entities/company.entity';
import { UserRole } from '../../auth/entities/user-role.entity';
import { BaseEntity } from '@/modules/common/entities/base.entity';

@Entity()
@ObjectType()
export class User extends BaseEntity {
  @Column()
  @FilterableField()
  name: string;

  @Column({ unique: true })
  @FilterableField()
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  avatar?: string;

  @Column({ default: false })
  @FilterableField()
  isVerified: boolean;

  @Column({ nullable: true })
  verificationToken?: string;

  @Column({ nullable: true })
  resetPasswordToken?: string;

  @Column({ nullable: true })
  tokenExpiration?: Date;

  @Column({ nullable: true })
  lastLogin?: Date;

  // Relacionamentos
  @ManyToOne(() => Organization, organization => organization.users, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  @Field(() => Organization, { nullable: true })
  organization?: Organization;

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  organizationId?: number;

  @ManyToOne(() => Place, place => place.users, { nullable: true })
  @JoinColumn({ name: 'placeId' })
  @Field(() => Place, { nullable: true })
  place?: Place;

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  placeId?: number;

  @ManyToOne(() => Company, company => company.users, { nullable: true })
  @JoinColumn({ name: 'companyId' })
  @Field(() => Company, { nullable: true })
  company?: Company;

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  companyId?: number;

  @OneToMany(() => UserRole, userRole => userRole.user)
  @Field(() => [UserRole], { nullable: true })
  userRoles?: UserRole[];

  // Removido o método generateUUID duplicado
  // O método da BaseEntity será usado automaticamente
}
