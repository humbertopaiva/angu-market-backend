// src/modules/file-upload/file-upload.service.ts
import { Injectable, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { User } from '@/modules/users/entities/user.entity';
import { RoleType } from '@/modules/auth/entities/role.entity';

interface UploadResult {
  url: string;
  key: string;
}

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private s3Client: S3Client;
  private bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('S3_BUCKET', 'angu-market-uploads');

    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      },
      endpoint: this.configService.get<string>('AWS_ENDPOINT'), // Optional: para MinIO/LocalStack
      forcePathStyle: this.configService.get<boolean>('S3_FORCE_PATH_STYLE', false),
    });

    this.logger.log(`S3 Client initialized for bucket: ${this.bucket}`);
  }

  // Gerar uma chave única para upload
  private generateKey(
    folder: string,
    userId: number,
    filename: string,
    customPath?: string,
  ): string {
    const extension = filename.split('.').pop() || '';
    const uuid = randomUUID();

    if (customPath) {
      // Se um caminho personalizado for fornecido, use-o
      // Exemplo: "organizations/1/places/2/logos/uuid.jpg"
      return `${customPath}/${folder}/${uuid}.${extension}`;
    }

    // Caminho padrão: uploads/folder/userId/uuid.extension
    return `uploads/${folder}/${userId}/${uuid}.${extension}`;
  }

  // Validar se o tipo de arquivo é permitido
  private validateFileType(filename: string): boolean {
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'doc', 'docx'];
    const extension = filename.split('.').pop()?.toLowerCase();

    if (!extension || !allowedExtensions.includes(extension)) {
      return false;
    }

    return true;
  }

  // Validar se o usuário pode fazer upload no caminho especificado
  private canUploadToPath(customPath: string | undefined, user: User): boolean {
    // Verificar roles do usuário
    const roles = user.userRoles?.map(ur => ur.role?.name).filter(Boolean) || [];

    // Usuários públicos NÃO podem fazer upload de nada
    if (
      roles.includes(RoleType.PUBLIC_USER) &&
      !roles.some(role =>
        [
          'SUPER_ADMIN',
          'ORGANIZATION_ADMIN',
          'PLACE_ADMIN',
          'COMPANY_ADMIN',
          'COMPANY_STAFF',
        ].includes(role),
      )
    ) {
      return false;
    }

    // Se não tem caminho personalizado, vai para pasta pessoal - permitir para usuários não-públicos
    if (!customPath) {
      return true;
    }

    // Verificar se o usuário pode acessar este caminho
    const mockKey = `${customPath}/test.jpg`; // Criar uma chave fictícia para testar
    return this.canAccessFile(mockKey, user);
  }
  private getContentType(filename: string, providedContentType?: string): string {
    if (providedContentType) {
      return providedContentType;
    }

    const extension = filename.split('.').pop()?.toLowerCase();

    const contentTypeMap: { [key: string]: string } = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    return contentTypeMap[extension || ''] || 'application/octet-stream';
  }

  async getPresignedUploadUrl(
    folder: string,
    filename: string,
    user: User,
    contentType?: string,
    customPath?: string,
  ): Promise<UploadResult> {
    try {
      // Validar tipo de arquivo
      if (!this.validateFileType(filename)) {
        throw new BadRequestException('Tipo de arquivo não permitido');
      }

      // Validar se o usuário pode fazer upload no caminho especificado
      if (!this.canUploadToPath(customPath, user)) {
        throw new ForbiddenException('Você não tem permissão para fazer upload neste local');
      }

      // Gerar uma chave única
      const key = this.generateKey(folder, user.id, filename, customPath);

      // Determinar o Content-Type
      const finalContentType = this.getContentType(filename, contentType);

      // Criar o comando de upload
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: finalContentType,
        Metadata: {
          'user-id': user.id.toString(),
          'uploaded-by': user.email,
          'original-filename': filename,
          'upload-timestamp': new Date().toISOString(),
          'organization-id': user.organizationId?.toString() || '',
          'place-id': user.placeId?.toString() || '',
          'company-id': user.companyId?.toString() || '',
        },
      });

      // Gerar URL pré-assinado com expiração de 5 minutos (300 segundos)
      const url = await getSignedUrl(this.s3Client, command, { expiresIn: 300 });

      this.logger.log(`Generated presigned URL for user ${user.id}, file: ${key}`);

      return {
        url,
        key,
      };
    } catch (error) {
      this.logger.error(
        `Error generating presigned URL: ${error instanceof Error ? error.message : String(error)}`,
      );

      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException(
        `Não foi possível gerar URL de upload: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      );
    }
  }

  getFileUrl(key: string): string {
    const region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    const customEndpoint = this.configService.get<string>('AWS_PUBLIC_ENDPOINT');

    if (customEndpoint) {
      // Para MinIO ou endpoints customizados
      return `${customEndpoint}/${this.bucket}/${key}`;
    }

    // URL padrão do S3 da AWS
    return `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  // Verificar se o usuário pode acessar/deletar o arquivo
  private canAccessFile(key: string, user: User): boolean {
    // Verificar roles do usuário
    const roles = user.userRoles?.map(ur => ur.role?.name).filter(Boolean) || [];

    // Super admin pode acessar tudo
    if (roles.includes(RoleType.SUPER_ADMIN)) {
      return true;
    }

    // Usuários públicos NÃO podem deletar arquivos
    if (
      roles.includes(RoleType.PUBLIC_USER) &&
      !roles.some(role =>
        [
          'SUPER_ADMIN',
          'ORGANIZATION_ADMIN',
          'PLACE_ADMIN',
          'COMPANY_ADMIN',
          'COMPANY_STAFF',
        ].includes(role),
      )
    ) {
      return false;
    }

    // Se o arquivo está no diretório pessoal do usuário, permitir (exceto PUBLIC_USER)
    if (
      key.includes(`/users/${user.id}/`) ||
      (key.includes(`uploads/`) && key.includes(`/${user.id}/`))
    ) {
      return (
        !roles.includes(RoleType.PUBLIC_USER) ||
        roles.some(role =>
          [
            'SUPER_ADMIN',
            'ORGANIZATION_ADMIN',
            'PLACE_ADMIN',
            'COMPANY_ADMIN',
            'COMPANY_STAFF',
          ].includes(role),
        )
      );
    }

    // Se o usuário tem organização e o arquivo está na pasta da organização
    if (user.organizationId && key.includes(`organizations/${user.organizationId}/`)) {
      return true;
    }

    // Se o usuário tem place e o arquivo está na pasta do place
    if (user.placeId && key.includes(`places/${user.placeId}/`)) {
      return true;
    }

    // Se o usuário tem empresa e o arquivo está na pasta da empresa
    if (user.companyId && key.includes(`companies/${user.companyId}/`)) {
      return true;
    }

    // Verificar se o arquivo está em um caminho hierárquico permitido
    // Ex: organizations/1/places/2/companies/3/
    if (user.organizationId && user.placeId && user.companyId) {
      const expectedPath = `organizations/${user.organizationId}/places/${user.placeId}/companies/${user.companyId}/`;
      if (key.includes(expectedPath)) {
        return true;
      }
    }

    // Organization admin pode acessar arquivos da sua organização
    if (
      roles.includes(RoleType.ORGANIZATION_ADMIN) &&
      user.organizationId &&
      key.includes(`organizations/${user.organizationId}/`)
    ) {
      return true;
    }

    // Place admin pode acessar arquivos do seu place
    if (
      roles.includes(RoleType.PLACE_ADMIN) &&
      user.placeId &&
      key.includes(`places/${user.placeId}/`)
    ) {
      return true;
    }

    // Company admin pode acessar arquivos da sua empresa
    if (
      roles.includes(RoleType.COMPANY_ADMIN) &&
      user.companyId &&
      key.includes(`companies/${user.companyId}/`)
    ) {
      return true;
    }

    return false;
  }

  async deleteFile(key: string, user: User): Promise<boolean> {
    try {
      if (!this.canAccessFile(key, user)) {
        this.logger.warn(`Unauthorized delete attempt by user ${user.id} for file ${key}`);
        throw new ForbiddenException('Você não tem permissão para deletar este arquivo');
      }

      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      this.logger.log(`Successfully deleted file: ${key} by user ${user.id}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Error deleting file: ${error instanceof Error ? error.message : String(error)}`,
      );

      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException('Erro ao deletar arquivo');
    }
  }

  // Método auxiliar para gerar caminhos personalizados
  generateCustomPath(type: 'organization' | 'place' | 'company' | 'user', id: number): string {
    switch (type) {
      case 'organization':
        return `organizations/${id}`;
      case 'place':
        return `places/${id}`;
      case 'company':
        return `companies/${id}`;
      case 'user':
        return `users/${id}`;
      default:
        return 'uploads';
    }
  }
}
