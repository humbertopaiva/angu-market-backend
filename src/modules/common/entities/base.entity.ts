import {
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  BeforeInsert,
} from 'typeorm';
import { ID, ObjectType } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';
import { v4 as uuidv4 } from 'uuid';

@ObjectType({ isAbstract: true })
export abstract class BaseEntity {
  @PrimaryGeneratedColumn()
  @FilterableField(() => ID)
  id: number;

  @Column({ type: 'uuid', unique: true })
  @FilterableField()
  uuid: string;

  @CreateDateColumn({ type: 'timestamp' })
  @FilterableField()
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  @FilterableField()
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  @FilterableField({ nullable: true })
  deletedAt?: Date;

  @Column({ default: true })
  @FilterableField()
  isActive: boolean;

  @BeforeInsert()
  generateUUID() {
    if (!this.uuid) {
      this.uuid = uuidv4();
    }
  }
}
