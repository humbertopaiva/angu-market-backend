import { registerEnumType } from '@nestjs/graphql';

export enum DeliveryZoneType {
  RADIUS = 'RADIUS',
  POLYGON = 'POLYGON',
  NEIGHBORHOOD = 'NEIGHBORHOOD',
  POSTAL_CODE = 'POSTAL_CODE',
}

registerEnumType(DeliveryZoneType, {
  name: 'DeliveryZoneType',
  description: 'Tipos de zona de entrega',
  valuesMap: {
    RADIUS: { description: 'Raio em quilômetros' },
    POLYGON: { description: 'Área poligonal customizada' },
    NEIGHBORHOOD: { description: 'Por bairros específicos' },
    POSTAL_CODE: { description: 'Por códigos postais' },
  },
});
