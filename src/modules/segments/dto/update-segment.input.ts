import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { CreateSegmentInput } from './create-segment.input';

@InputType()
export class UpdateSegmentInput extends PartialType(CreateSegmentInput) {
  @Field(() => Int)
  @IsNotEmpty()
  @IsNumber()
  id: number;
}
