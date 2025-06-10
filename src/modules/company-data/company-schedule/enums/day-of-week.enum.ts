import { registerEnumType } from '@nestjs/graphql';

export enum DayOfWeek {
  SEGUNDA = 'SEGUNDA',
  TERCA = 'TERCA',
  QUARTA = 'QUARTA',
  QUINTA = 'QUINTA',
  SEXTA = 'SEXTA',
  SABADO = 'SABADO',
  DOMINGO = 'DOMINGO',
}

registerEnumType(DayOfWeek, {
  name: 'DayOfWeek',
  description: 'Dias da semana',
  valuesMap: {
    SEGUNDA: { description: 'Segunda-feira' },
    TERCA: { description: 'Terça-feira' },
    QUARTA: { description: 'Quarta-feira' },
    QUINTA: { description: 'Quinta-feira' },
    SEXTA: { description: 'Sexta-feira' },
    SABADO: { description: 'Sábado' },
    DOMINGO: { description: 'Domingo' },
  },
});
