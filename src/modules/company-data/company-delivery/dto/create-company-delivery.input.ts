import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryType } from '../enums/delivery-type.enum';
import { CreateDeliveryZoneInput } from './create-delivery-zone.input';

@InputType()
export class CreateCompanyDeliveryInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @Field(() => [DeliveryType], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsEnum(DeliveryType, { each: true })
  availableTypes?: DeliveryType[];

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseFee?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  freeDeliveryMinValue?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(5)
  estimatedTimeMinutes?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(5)
  pickupTimeMinutes?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumOrderValue?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumOrderValue?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  acceptsCash?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  acceptsCard?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  acceptsPix?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  deliveryInstructions?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  pickupInstructions?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryPhone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryWhatsApp?: string;

  @Field(() => [CreateDeliveryZoneInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDeliveryZoneInput)
  deliveryZones?: CreateDeliveryZoneInput[];
}