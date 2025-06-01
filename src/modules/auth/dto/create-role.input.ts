import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { RoleType } from '../entities/role.entity';

@InputType()
export class CreateRoleInput {
  @Field(() => RoleType)
  @IsNotEmpty()
  @IsEnum(RoleType)
  name: RoleType;

  @Field()
  @IsNotEmpty()
  @IsString()
  description: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
