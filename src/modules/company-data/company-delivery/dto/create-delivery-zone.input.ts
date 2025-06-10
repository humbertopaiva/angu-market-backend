import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsObject,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { DeliveryZoneType } from '../enums/delivery-zone-type.enum';

@InputType()
export class CreateDeliveryZoneInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @Field(() => DeliveryZoneType)
  @IsNotEmpty()
  @IsEnum(DeliveryZoneType)
  zoneType: DeliveryZoneType;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(100)
  radiusKm?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsObject()
  coordinates?: object;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  neighborhoods?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  postalCodes?: string;

  @Field()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  deliveryFee: number;

  @Field(() => Int)
  @IsNotEmpty()
  @IsNumber()
  @Min(5)
  @Max(300)
  estimatedTimeMinutes: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumOrderValue?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  priority?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsObject()
  customSchedule?: object;
}
