import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { CreateScheduleHourInput } from './create-schedule-hour.input';

@InputType()
export class UpdateScheduleHourInput extends PartialType(CreateScheduleHourInput) {
  @Field(() => Int)
  @IsNotEmpty()
  @IsNumber()
  id: number;
}
