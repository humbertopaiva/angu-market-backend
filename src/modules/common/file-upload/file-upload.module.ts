// src/modules/file-upload/file-upload.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FileUploadService } from './file-upload.service';

import { User } from '@/modules/users/entities/user.entity';
import { FileUploadResolver } from './file-upload.resolver';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([User])],
  providers: [FileUploadService, FileUploadResolver],
  exports: [FileUploadService],
})
export class FileUploadModule {}
