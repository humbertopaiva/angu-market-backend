import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { CreateCompanyBasicInfoInput } from './create-company-basic-info.input';

@InputType()
export class UpdateCompanyBasicInfoInput extends PartialType(CreateCompanyBasicInfoInput) {
  @Field(() => Int)
  @IsNotEmpty()
  @IsNumber()
  id: number;
}
