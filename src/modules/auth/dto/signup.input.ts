import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsString, MinLength } from 'class-validator';

@InputType()
export class SignUpInput {
  @Field()
  @IsString({ message: 'Nome é obrigatório' })
  name: string;

  @Field()
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @Field()
  @IsString()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres' })
  password: string;

  @Field()
  @IsString()
  @MinLength(6, { message: 'A confirmação de senha deve ter pelo menos 6 caracteres' })
  passwordConfirmation: string;
}
