import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class VerifyEmailInput {
  @Field()
  @IsString()
  @IsNotEmpty({ message: 'Token é obrigatório' })
  token: string;
}
