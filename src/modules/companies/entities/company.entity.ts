import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';
import { Place } from '../../places/entities/place.entity';
import { User } from '../../users/entities/user.entity';
import { BaseEntity } from '@/modules/common/entities/base.entity';

@Entity()
@ObjectType()
export class Company extends BaseEntity {
  @Column()
  @FilterableField()
  name: string;

  @Column({ unique: true })
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

  // Relacionamentos
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
}
