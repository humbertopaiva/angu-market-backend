import { InputType, Field, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsOptional, IsNumber, IsBoolean, IsHexColor } from 'class-validator';

@InputType()
export class CreateCategoryInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  name: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  slug: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  description: string;

  @Field(() => Int)
  @IsNotEmpty()
  @IsNumber()
  placeId: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  icon?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsHexColor()
  color?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  order?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  keywords?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field(() => [Int], { nullable: true })
  @IsOptional()
  @IsNumber({}, { each: true })
  segmentIds?: number[];
}
