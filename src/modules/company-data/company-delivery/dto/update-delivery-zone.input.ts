import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { CreateDeliveryZoneInput } from './create-delivery-zone.input';

@InputType()
export class UpdateDeliveryZoneInput extends PartialType(CreateDeliveryZoneInput) {
  @Field(() => Int)
  @IsNotEmpty()
  @IsNumber()
  id: number;
}
