import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString, IsEmail, IsUrl, MaxLength } from 'class-validator';

@InputType()
export class CreateCompanyBasicInfoInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Descrição deve ter no máximo 5000 caracteres' })
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Telefone deve ter no máximo 20 caracteres' })
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'WhatsApp deve ter no máximo 20 caracteres' })
  whatsapp?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail({}, { message: 'Email deve ser um endereço válido' })
  @MaxLength(255, { message: 'Email deve ter no máximo 255 caracteres' })
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Endereço deve ter no máximo 1000 caracteres' })
  address?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Logo deve ser uma URL válida' })
  @MaxLength(500, { message: 'URL do logo deve ter no máximo 500 caracteres' })
  logo?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Banner deve ser uma URL válida' })
  @MaxLength(500, { message: 'URL do banner deve ter no máximo 500 caracteres' })
  banner?: string;
}
