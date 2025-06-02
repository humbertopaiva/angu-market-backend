import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NestjsQueryGraphQLModule } from '@nestjs-query/query-graphql';
import { NestjsQueryTypeOrmModule } from '@nestjs-query/query-typeorm';

import { SegmentsService } from './segments.service';
import { SegmentsResolver } from './segments.resolver';

import { Segment } from './entities/segment.entity';

import { Place } from '../places/entities/place.entity';

import { CreateSegmentInput } from './dto/create-segment.input';
import { UpdateSegmentInput } from './dto/update-segment.input';
import { Category } from './entities/company-category.entity';
import { Subcategory } from './entities/company-subcategory.entity';
import { CreateCategoryInput } from './dto/create-company-category.input';
import { UpdateCategoryInput } from './dto/update-company-category.input';
import { CreateSubcategoryInput } from './dto/create-company-subcategory.input';
import { UpdateSubcategoryInput } from './dto/update-company-subcategory.input';
import { CategoriesService } from './company-categories.service';
import { CategoriesResolver } from './company-categories.resolver';
import { SubcategoriesService } from './company-subcategories.service';
import { SubcategoriesResolver } from './company-subcategories.resolver';

@Module({
  imports: [
    TypeOrmModule.forFeature([Segment, Category, Subcategory, Place]),
    NestjsQueryGraphQLModule.forFeature({
      imports: [NestjsQueryTypeOrmModule.forFeature([Segment])],
      resolvers: [
        {
          DTOClass: Segment,
          EntityClass: Segment,
          CreateDTOClass: CreateSegmentInput,
          UpdateDTOClass: UpdateSegmentInput,
          enableAggregate: true,
          create: { disabled: true }, // Usa custom resolver
          update: { disabled: true },
          delete: { disabled: true },
        },
      ],
    }),
    NestjsQueryGraphQLModule.forFeature({
      imports: [NestjsQueryTypeOrmModule.forFeature([Category])],
      resolvers: [
        {
          DTOClass: Category,
          EntityClass: Category,
          CreateDTOClass: CreateCategoryInput,
          UpdateDTOClass: UpdateCategoryInput,
          enableAggregate: true,
          create: { disabled: true }, // Usa custom resolver
          update: { disabled: true },
          delete: { disabled: true },
        },
      ],
    }),
    NestjsQueryGraphQLModule.forFeature({
      imports: [NestjsQueryTypeOrmModule.forFeature([Subcategory])],
      resolvers: [
        {
          DTOClass: Subcategory,
          EntityClass: Subcategory,
          CreateDTOClass: CreateSubcategoryInput,
          UpdateDTOClass: UpdateSubcategoryInput,
          enableAggregate: true,
          create: { disabled: true }, // Usa custom resolver
          update: { disabled: true },
          delete: { disabled: true },
        },
      ],
    }),
  ],
  providers: [
    SegmentsService,
    SegmentsResolver,
    CategoriesService,
    CategoriesResolver,
    SubcategoriesService,
    SubcategoriesResolver,
  ],
  exports: [SegmentsService, CategoriesService, SubcategoriesService],
})
export class SegmentationModule {}
