import { InputType, Field, ID } from '@nestjs/graphql';
import { IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';
import { RoleType } from '../entities/role.entity';

@InputType()
export class RoleInput {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  id?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  uuid?: string;

  @Field(() => RoleType, { nullable: true })
  @IsOptional()
  @IsEnum(RoleType)
  name?: RoleType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
