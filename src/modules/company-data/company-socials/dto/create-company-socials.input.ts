import { InputType, Field } from '@nestjs/graphql';
import {
  IsOptional,
  IsString,
  IsBoolean,
  MaxLength,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCompanySocialInput } from './create-company-social.input';

@InputType()
export class CreateCompanySocialsInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Estratégia deve ter no máximo 1000 caracteres' })
  socialMediaStrategy?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Contato social principal deve ter no máximo 500 caracteres' })
  primaryContactSocial?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  showFollowersCount?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  allowMessages?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Regras devem ter no máximo 2000 caracteres' })
  socialMediaRules?: string;

  @Field(() => [CreateCompanySocialInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCompanySocialInput)
  socialNetworks?: CreateCompanySocialInput[];
}
