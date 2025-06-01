import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEmail,
  IsNumber,
  IsBoolean,
  MinLength,
} from 'class-validator';

@InputType()
export class CreateUserInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  name: string;

  @Field()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  avatar?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  organizationId?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  placeId?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  companyId?: number;

  @Field(() => [Int], { nullable: true })
  @IsOptional()
  @IsNumber({}, { each: true })
  roleIds?: number[];

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
