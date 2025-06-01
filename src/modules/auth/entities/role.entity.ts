import { Entity, Column, OneToMany } from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';
import { BaseEntity } from '@/modules/common/entities/base.entity';
import { UserRole } from './user-role.entity';

export enum RoleType {
  SUPER_ADMIN = 'SUPER_ADMIN', // Acesso completo ao sistema
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN', // Admin de uma organização
  PLACE_ADMIN = 'PLACE_ADMIN', // Admin de um place
  COMPANY_ADMIN = 'COMPANY_ADMIN', // Admin de uma empresa
  COMPANY_STAFF = 'COMPANY_STAFF', // Funcionário de empresa
  PUBLIC_USER = 'PUBLIC_USER', // Usuário público
}

registerEnumType(RoleType, {
  name: 'RoleType',
  description: 'Os tipos de papéis disponíveis no sistema',
});

@Entity()
@ObjectType()
export class Role extends BaseEntity {
  @Column({
    type: 'enum',
    enum: RoleType,
    default: RoleType.PUBLIC_USER,
  })
  @FilterableField(() => RoleType)
  name: RoleType;

  @Column()
  @FilterableField()
  description: string;

  // Relacionamentos
  @OneToMany(() => UserRole, userRole => userRole.role)
  @Field(() => [UserRole], { nullable: true })
  userRoles?: UserRole[];
}
