// src/modules/companies/dto/create-company.input.ts - HIERARQUIA OBRIGATÓRIA
import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsEmail,
  IsUrl,
  IsBoolean,
  IsDecimal,
  IsArray,
  ValidateNested,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CreateCompanyUserInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  existingUserId?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  role?: 'COMPANY_ADMIN' | 'COMPANY_STAFF';

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@InputType()
export class CreateCompanyInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  name: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  slug: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  description: string;

  @Field(() => Int)
  @IsNotEmpty()
  @IsNumber()
  placeId: number;

  // CAMPOS DE SEGMENTAÇÃO - TODOS OBRIGATÓRIOS
  @Field(() => Int)
  @IsNotEmpty()
  @IsNumber()
  segmentId: number;

  @Field(() => Int)
  @IsNotEmpty()
  @IsNumber()
  categoryId: number;

  @Field(() => Int)
  @IsNotEmpty()
  @IsNumber()
  subcategoryId: number;

  // Campos opcionais da empresa
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl()
  website?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDecimal()
  latitude?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsDecimal()
  longitude?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  openingHours?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  logo?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  banner?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  cnpj?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field(() => [CreateCompanyUserInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCompanyUserInput)
  users?: CreateCompanyUserInput[];
}
