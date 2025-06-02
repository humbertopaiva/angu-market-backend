import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { CreateSubcategoryInput } from './create-company-subcategory.input';

@InputType()
export class UpdateSubcategoryInput extends PartialType(CreateSubcategoryInput) {
  @Field(() => Int)
  @IsNotEmpty()
  @IsNumber()
  id: number;
}
