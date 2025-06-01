// src/modules/users/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ObjectType, ID } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';

@Entity()
@ObjectType()
export class User {
  @PrimaryGeneratedColumn()
  @FilterableField(() => ID)
  id: number;

  @Column()
  @FilterableField()
  name: string;

  @Column({ unique: true })
  @FilterableField()
  email: string;

  @Column({ nullable: true })
  @FilterableField({ nullable: true })
  age?: number;
}
