import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';

import { User } from '../../users/entities/user.entity';
import { Role } from './role.entity';
import { BaseEntity } from '@/modules/common/entities/base.entity';

@Entity()
@ObjectType()
export class UserRole extends BaseEntity {
  // Relacionamentos
  @ManyToOne(() => User, user => user.userRoles)
  @JoinColumn({ name: 'userId' })
  @Field(() => User)
  user: User;

  @Column()
  @FilterableField()
  userId: number;

  @ManyToOne(() => Role, role => role.userRoles)
  @JoinColumn({ name: 'roleId' })
  @Field(() => Role)
  role: Role;

  @Column()
  @FilterableField()
  roleId: number;
}
