// src/modules/places/places.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NestjsQueryGraphQLModule } from '@nestjs-query/query-graphql';
import { NestjsQueryTypeOrmModule } from '@nestjs-query/query-typeorm';

import { PlacesService } from './places.service';
import { PlacesResolver } from './places.resolver';
import { Place } from './entities/place.entity';
import { CreatePlaceInput } from './dto/create-place.input';
import { UpdatePlaceInput } from './dto/update-place.input';
import { SystemModule } from '../common/config/system.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Place]),
    SystemModule,
    NestjsQueryGraphQLModule.forFeature({
      imports: [NestjsQueryTypeOrmModule.forFeature([Place])],
      resolvers: [
        {
          DTOClass: Place,
          EntityClass: Place,
          CreateDTOClass: CreatePlaceInput,
          UpdateDTOClass: UpdatePlaceInput,
          enableAggregate: true,
          create: { disabled: true }, // Usar custom resolver
          update: { disabled: true },
          delete: { disabled: true },
        },
      ],
    }),
  ],
  providers: [PlacesResolver, PlacesService],
  exports: [PlacesService],
})
export class PlacesModule {}
