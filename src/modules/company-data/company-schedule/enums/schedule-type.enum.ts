import { registerEnumType } from '@nestjs/graphql';

export enum ScheduleType {
  REGULAR = 'REGULAR',
  SPECIAL = 'SPECIAL',
  HOLIDAY = 'HOLIDAY',
  VACATION = 'VACATION',
  TEMPORARY_CLOSURE = 'TEMPORARY_CLOSURE',
}

registerEnumType(ScheduleType, {
  name: 'ScheduleType',
  description: 'Tipos de horário',
  valuesMap: {
    REGULAR: { description: 'Horário regular' },
    SPECIAL: { description: 'Horário especial' },
    HOLIDAY: { description: 'Feriado' },
    VACATION: { description: 'Férias' },
    TEMPORARY_CLOSURE: { description: 'Fechamento temporário' },
  },
});
