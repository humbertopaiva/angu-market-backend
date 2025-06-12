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
  @IsString()
  @MaxLength(255)
  name: string;

  @Field()
  @IsString()
  neighborhoods: string; // Lista de bairros separados por vírgula

  @Field()
  @IsNumber()
  @Min(0)
  deliveryFee: number;

  @Field(() => Int)
  @IsNumber()
  @Min(5)
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
  priority?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}