import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  ValidateNested,
  IsArray,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateScheduleHourInput } from './create-schedule-hour.input';

@InputType()
export class CreateCompanyScheduleInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  allowOnlineScheduling?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(480)
  slotDurationMinutes?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  advanceBookingDays?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  scheduleNotes?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  holidayMessage?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  closedMessage?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  showNextOpenTime?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  autoUpdateStatus?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  hasDeliverySchedule?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  hasTakeoutSchedule?: boolean;

  @Field(() => [CreateScheduleHourInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateScheduleHourInput)
  scheduleHours?: CreateScheduleHourInput[];
}
