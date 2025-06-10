import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsString,
  IsUrl,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { SocialNetworkType } from '../enums/social-network.enum';

@InputType()
export class CreateCompanySocialInput {
  @Field(() => SocialNetworkType)
  @IsNotEmpty()
  @IsEnum(SocialNetworkType)
  networkType: SocialNetworkType;

  @Field()
  @IsNotEmpty()
  @IsString()
  @IsUrl({}, { message: 'URL deve ser válida' })
  @MaxLength(500, { message: 'URL deve ter no máximo 500 caracteres' })
  url: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Username deve ter no máximo 100 caracteres' })
  username?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Nome de exibição deve ter no máximo 255 caracteres' })
  displayName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Descrição deve ter no máximo 1000 caracteres' })
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Ordem de exibição deve ser maior ou igual a 0' })
  @Max(100, { message: 'Ordem de exibição deve ser menor ou igual a 100' })
  displayOrder?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Número de seguidores deve ser maior ou igual a 0' })
  followersCount?: number;
}
