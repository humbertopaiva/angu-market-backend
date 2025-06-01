import { Entity, Column, OneToMany } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';
import { Place } from '../../places/entities/place.entity';
import { User } from '../../users/entities/user.entity';
import { BaseEntity } from '@/modules/common/entities/base.entity';

@Entity()
@ObjectType()
export class Organization extends BaseEntity {
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
  logo?: string;

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  banner?: string;

  // Relacionamentos
  @OneToMany(() => Place, (place: Place) => place.organization)
  @Field(() => [Place], { nullable: true })
  places?: Place[];

  @OneToMany(() => User, user => user.organization)
  @Field(() => [User], { nullable: true })
  users?: User[];
}
