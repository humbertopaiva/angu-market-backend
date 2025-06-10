import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { CreateCompanySocialsInput } from './create-company-socials.input';

@InputType()
export class UpdateCompanySocialsInput extends PartialType(CreateCompanySocialsInput) {
  @Field(() => Int)
  @IsNotEmpty()
  @IsNumber()
  id: number;
}
