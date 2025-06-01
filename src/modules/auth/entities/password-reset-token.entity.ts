// src/modules/auth/entities/password-reset-token.entity.ts
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';
import { BaseEntity } from '@/modules/common/entities/base.entity';

@Entity('password_reset_tokens')
@ObjectType()
export class PasswordResetToken extends BaseEntity {
  @Column()
  @Field()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  @Field(() => User)
  user: User;

  @Column()
  @Field()
  token: string;

  @Column({ default: false })
  @Field()
  used: boolean;

  @Column({ type: 'timestamp' })
  @Field()
  expiresAt: Date;
}
