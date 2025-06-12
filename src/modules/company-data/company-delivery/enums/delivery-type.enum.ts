// src/modules/company-data/company-delivery/enums/delivery-type.enum.ts
import { registerEnumType } from '@nestjs/graphql';

export enum DeliveryType {
  DELIVERY = 'DELIVERY',
  PICKUP = 'PICKUP',
  DINE_IN = 'DINE_IN',
}

registerEnumType(DeliveryType, {
  name: 'DeliveryType',
  description: 'Tipos de serviço de entrega',
  valuesMap: {
    DELIVERY: { description: 'Entrega a domicílio' },
    PICKUP: { description: 'Retirada no local' },
    DINE_IN: { description: 'Consumo no local' },
  },
});