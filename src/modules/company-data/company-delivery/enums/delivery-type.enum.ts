import { registerEnumType } from '@nestjs/graphql';

export enum DeliveryType {
  DELIVERY = 'DELIVERY',
  PICKUP = 'PICKUP',
  DINE_IN = 'DINE_IN',
  DRIVE_THRU = 'DRIVE_THRU',
}

registerEnumType(DeliveryType, {
  name: 'DeliveryType',
  description: 'Tipos de serviço de entrega',
  valuesMap: {
    DELIVERY: { description: 'Entrega a domicílio' },
    PICKUP: { description: 'Retirada no local' },
    DINE_IN: { description: 'Consumo no local' },
    DRIVE_THRU: { description: 'Drive-thru' },
  },
});
