import { Field, InputType } from '@nestjs/graphql';
import { IsString, IsNotEmpty } from 'class-validator';

@InputType()
export class DeleteFileInput {
  @Field()
  @IsString()
  @IsNotEmpty({ message: 'Chave do arquivo é obrigatória' })
  key: string;
}
