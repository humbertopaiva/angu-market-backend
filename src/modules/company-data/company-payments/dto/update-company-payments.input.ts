import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { CreateCompanyPaymentsInput } from './create-company-payments.input';

@InputType()
export class UpdateCompanyPaymentsInput extends PartialType(CreateCompanyPaymentsInput) {
  @Field(() => Int)
  @IsNotEmpty()
  @IsNumber()
  id: number;
}
