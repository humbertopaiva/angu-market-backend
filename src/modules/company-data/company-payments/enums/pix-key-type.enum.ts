import { registerEnumType } from '@nestjs/graphql';

export enum PixKeyType {
  CPF = 'CPF',
  CNPJ = 'CNPJ',
  EMAIL = 'EMAIL',
  TELEFONE = 'TELEFONE',
  CHAVE_ALEATORIA = 'CHAVE_ALEATORIA',
}

registerEnumType(PixKeyType, {
  name: 'PixKeyType',
  description: 'Tipos de chave PIX',
  valuesMap: {
    CPF: {
      description: 'CPF',
    },
    CNPJ: {
      description: 'CNPJ',
    },
    EMAIL: {
      description: 'E-mail',
    },
    TELEFONE: {
      description: 'Telefone',
    },
    CHAVE_ALEATORIA: {
      description: 'Chave Aleatória',
    },
  },
});
