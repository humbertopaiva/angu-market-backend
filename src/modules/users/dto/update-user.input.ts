import { InputType, Field, Int, PartialType, OmitType } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { CreateUserInput } from './create-user.input';

@InputType()
export class UpdateUserInput extends PartialType(OmitType(CreateUserInput, ['email'] as const)) {
  @Field(() => Int)
  @IsNotEmpty()
  @IsNumber()
  id: number;
}
