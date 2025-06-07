import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SegmentsService } from './segments.service';
import { SegmentsResolver } from './segments.resolver';
import { CategoriesService } from './company-categories.service';
import { CategoriesResolver } from './company-categories.resolver';
import { SubcategoriesService } from './company-subcategories.service';
import { SubcategoriesResolver } from './company-subcategories.resolver';

// Entities
import { Segment } from './entities/segment.entity';
import { Category } from './entities/company-category.entity';
import { Subcategory } from './entities/company-subcategory.entity';
import { Place } from '../places/entities/place.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Segment,
      Category,
      Subcategory,
      Place, // IMPORTANTE: Incluir Place para os relacionamentos
    ]),
  ],
  providers: [
    // Services
    SegmentsService,
    CategoriesService,
    SubcategoriesService,
    // Resolvers
    SegmentsResolver,
    CategoriesResolver,
    SubcategoriesResolver,
  ],
  exports: [SegmentsService, CategoriesService, SubcategoriesService],
})
export class SegmentationModule {}
