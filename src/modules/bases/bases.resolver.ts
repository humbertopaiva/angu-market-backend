import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { BasesService } from './bases.service';
import { Base } from './entities/base.entity';
import { CreateBaseInput } from './dto/create-base.input';
import { UpdateBaseInput } from './dto/update-base.input';

@Resolver(() => Base)
export class BasesResolver {
  constructor(private readonly basesService: BasesService) {}

  @Mutation(() => Base)
  createBase(@Args('createBaseInput') createBaseInput: CreateBaseInput) {
    return this.basesService.create(createBaseInput);
  }

  @Query(() => [Base], { name: 'bases' })
  findAll() {
    return this.basesService.findAll();
  }

  @Query(() => Base, { name: 'base' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.basesService.findOne(id);
  }

  @Mutation(() => Base)
  updateBase(@Args('updateBaseInput') updateBaseInput: UpdateBaseInput) {
    return this.basesService.update(updateBaseInput.id, updateBaseInput);
  }

  @Mutation(() => Base)
  removeBase(@Args('id', { type: () => Int }) id: number) {
    return this.basesService.remove(id);
  }
}
