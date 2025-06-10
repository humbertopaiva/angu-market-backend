import { registerEnumType } from '@nestjs/graphql';

export enum PaymentMethodType {
  PIX = 'PIX',
  CARTAO_DEBITO = 'CARTAO_DEBITO',
  CARTAO_CREDITO = 'CARTAO_CREDITO',
  BOLETO = 'BOLETO',
  VALE_ALIMENTACAO = 'VALE_ALIMENTACAO',
  VALE_REFEICAO = 'VALE_REFEICAO',
  DINHEIRO = 'DINHEIRO',
}

registerEnumType(PaymentMethodType, {
  name: 'PaymentMethodType',
  description: 'Tipos de métodos de pagamento aceitos pela empresa',
  valuesMap: {
    PIX: {
      description: 'Pagamento via PIX',
    },
    CARTAO_DEBITO: {
      description: 'Cartão de Débito',
    },
    CARTAO_CREDITO: {
      description: 'Cartão de Crédito',
    },
    BOLETO: {
      description: 'Boleto Bancário',
    },
    VALE_ALIMENTACAO: {
      description: 'Vale Alimentação',
    },
    VALE_REFEICAO: {
      description: 'Vale Refeição',
    },
    DINHEIRO: {
      description: 'Dinheiro',
    },
  },
});
