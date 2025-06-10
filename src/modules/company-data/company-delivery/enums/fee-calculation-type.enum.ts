import { registerEnumType } from '@nestjs/graphql';

export enum FeeCalculationType {
  FIXED = 'FIXED',
  BY_DISTANCE = 'BY_DISTANCE',
  BY_ZONE = 'BY_ZONE',
  BY_ORDER_VALUE = 'BY_ORDER_VALUE',
  FREE = 'FREE',
}

registerEnumType(FeeCalculationType, {
  name: 'FeeCalculationType',
  description: 'Tipos de cálculo de taxa de entrega',
  valuesMap: {
    FIXED: { description: 'Taxa fixa' },
    BY_DISTANCE: { description: 'Por distância' },
    BY_ZONE: { description: 'Por zona de entrega' },
    BY_ORDER_VALUE: { description: 'Por valor do pedido' },
    FREE: { description: 'Entrega gratuita' },
  },
});
