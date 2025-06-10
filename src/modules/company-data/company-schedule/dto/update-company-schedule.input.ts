import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { CreateCompanyScheduleInput } from './create-company-schedule.input';

@InputType()
export class UpdateCompanyScheduleInput extends PartialType(CreateCompanyScheduleInput) {
  @Field(() => Int)
  @IsNotEmpty()
  @IsNumber()
  id: number;
}
