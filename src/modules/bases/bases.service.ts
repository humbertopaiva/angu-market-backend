import { Injectable } from '@nestjs/common';
import { CreateBaseInput } from './dto/create-base.input';
import { UpdateBaseInput } from './dto/update-base.input';

@Injectable()
export class BasesService {
  create(createBaseInput: CreateBaseInput) {
    return 'This action adds a new base';
  }

  findAll() {
    return `This action returns all bases`;
  }

  findOne(id: number) {
    return `This action returns a #${id} base`;
  }

  update(id: number, updateBaseInput: UpdateBaseInput) {
    return `This action updates a #${id} base`;
  }

  remove(id: number) {
    return `This action removes a #${id} base`;
  }
}
