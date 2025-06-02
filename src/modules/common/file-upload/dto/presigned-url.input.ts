import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

@InputType()
export class PresignedUrlInput {
  @Field()
  @IsString()
  @IsNotEmpty({ message: 'Folder é obrigatório' })
  folder: string;

  @Field()
  @IsString()
  @IsNotEmpty({ message: 'Nome do arquivo é obrigatório' })
  filename: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  contentType?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  customPath?: string; // Caminho personalizado (ex: "organizations/1/places/2")
}
