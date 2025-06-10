import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { CreateCompanySocialInput } from './create-company-social.input';

@InputType()
export class UpdateCompanySocialInput extends PartialType(CreateCompanySocialInput) {
  @Field(() => Int)
  @IsNotEmpty()
  @IsNumber()
  id: number;
}
