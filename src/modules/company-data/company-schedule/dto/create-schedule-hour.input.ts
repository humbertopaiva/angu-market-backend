import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsDateString,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { DayOfWeek } from '../enums/day-of-week.enum';
import { ScheduleType } from '../enums/schedule-type.enum';

@InputType()
export class CreateScheduleHourInput {
  @Field(() => DayOfWeek)
  @IsNotEmpty()
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @Field(() => ScheduleType, { nullable: true })
  @IsOptional()
  @IsEnum(ScheduleType)
  scheduleType?: ScheduleType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Horário de abertura deve estar no formato HH:MM',
  })
  openTime?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Horário de fechamento deve estar no formato HH:MM',
  })
  closeTime?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  is24Hours?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Horário de início do intervalo deve estar no formato HH:MM',
  })
  breakStartTime?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Horário de fim do intervalo deve estar no formato HH:MM',
  })
  breakEndTime?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  specificDate?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  priority?: number;
}
