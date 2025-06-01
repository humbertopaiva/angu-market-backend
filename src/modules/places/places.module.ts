import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NestjsQueryGraphQLModule } from '@nestjs-query/query-graphql';
import { NestjsQueryTypeOrmModule } from '@nestjs-query/query-typeorm';

import { PlacesService } from './places.service';
import { PlacesResolver } from './places.resolver';
import { Place } from './entities/place.entity';
import { CreatePlaceInput } from './dto/create-place.input';
import { UpdatePlaceInput } from './dto/update-place.input';

@Module({
  imports: [
    TypeOrmModule.forFeature([Place]),
    NestjsQueryGraphQLModule.forFeature({
      imports: [NestjsQueryTypeOrmModule.forFeature([Place])],
      resolvers: [
        {
          DTOClass: Place,
          EntityClass: Place,
          CreateDTOClass: CreatePlaceInput,
          UpdateDTOClass: UpdatePlaceInput,
          enableAggregate: true,
        },
      ],
    }),
  ],
  providers: [PlacesResolver, PlacesService],
  exports: [PlacesService],
})
export class PlacesModule {}
