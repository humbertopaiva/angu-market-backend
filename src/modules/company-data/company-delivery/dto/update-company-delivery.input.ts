import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { CreateCompanyDeliveryInput } from './create-company-delivery.input';

@InputType()
export class UpdateCompanyDeliveryInput extends PartialType(CreateCompanyDeliveryInput) {
  @Field(() => Int)
  @IsNotEmpty()
  @IsNumber()
  id: number;
}
