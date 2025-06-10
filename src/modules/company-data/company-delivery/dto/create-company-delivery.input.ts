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
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryType } from '../enums/delivery-type.enum';
import { FeeCalculationType } from '../enums/fee-calculation-type.enum';
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

  @Field(() => FeeCalculationType, { nullable: true })
  @IsOptional()
  @IsEnum(FeeCalculationType)
  feeCalculationType?: FeeCalculationType;

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

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  feePerKm?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(300)
  estimatedTimeMinutes?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(600)
  maxDeliveryTimeMinutes?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
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
  acceptPreOrders?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  maxPreOrderDays?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  requiresAge?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(16)
  @Max(21)
  minimumAge?: number;

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
  @IsBoolean()
  requiresPrepayment?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  enableTracking?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  sendSMSUpdates?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  sendWhatsAppUpdates?: boolean;

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

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxConcurrentOrders?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxDailyOrders?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  hasLoyaltyProgram?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  loyaltyDiscountPercent?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  loyaltyMinOrders?: number;

  @Field(() => [CreateDeliveryZoneInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDeliveryZoneInput)
  deliveryZones?: CreateDeliveryZoneInput[];
}
