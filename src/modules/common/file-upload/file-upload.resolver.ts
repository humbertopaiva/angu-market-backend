// src/modules/file-upload/file-upload.resolver.ts
import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { FileUploadService } from './file-upload.service';
import { PresignedUrlResponse } from './dto/presigned-url-response.dto';
import { PresignedUrlInput } from './dto/presigned-url.input';
import { DeleteFileInput } from './dto/delete-file.input';
import { User } from '@/modules/users/entities/user.entity';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';

@Resolver()
export class FileUploadResolver {
  private readonly logger = new Logger(FileUploadResolver.name);

  constructor(
    private readonly fileUploadService: FileUploadService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Mutation(() => PresignedUrlResponse)
  @UseGuards(JwtAuthGuard)
  async getPresignedUploadUrl(
    @Args('input') input: PresignedUrlInput,
    @CurrentUser() currentUser: User,
  ): Promise<PresignedUrlResponse> {
    this.logger.log(`Generating presigned URL for user ${currentUser.id}`);

    // Buscar o usuário com todas as relações necessárias para validação
    const user = await this.userRepository.findOne({
      where: { id: currentUser.id },
      relations: ['organization', 'place', 'company', 'userRoles', 'userRoles.role'],
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const { folder, filename, contentType, customPath } = input;

    // Obter URL pré-assinada do serviço de upload
    const result = await this.fileUploadService.getPresignedUploadUrl(
      folder,
      filename,
      user,
      contentType,
      customPath,
    );

    // Resposta com a URL pré-assinada, chave e URL final do arquivo
    return {
      presignedUrl: result.url,
      key: result.key,
      fileUrl: this.fileUploadService.getFileUrl(result.key),
    };
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteFile(
    @Args('input') input: DeleteFileInput,
    @CurrentUser() currentUser: User,
  ): Promise<boolean> {
    this.logger.log(`Deleting file ${input.key} for user ${currentUser.id}`);

    // Buscar o usuário com todas as relações necessárias para validação
    const user = await this.userRepository.findOne({
      where: { id: currentUser.id },
      relations: ['organization', 'place', 'company', 'userRoles', 'userRoles.role'],
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    return this.fileUploadService.deleteFile(input.key, user);
  }

  @Query(() => String)
  @UseGuards(JwtAuthGuard)
  getFileUrl(@Args('key') key: string): string {
    return this.fileUploadService.getFileUrl(key);
  }

  // Query para gerar caminhos personalizados (útil para o frontend)
  @Query(() => String)
  @UseGuards(JwtAuthGuard)
  generateCustomPath(
    @Args('type') type: 'organization' | 'place' | 'company' | 'user',
    @Args('id') id: number,
  ): string {
    return this.fileUploadService.generateCustomPath(type, id);
  }
}
