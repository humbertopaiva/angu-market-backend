import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1717173000000 implements MigrationInterface {
  name = 'InitialSchema1717173000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Habilitar extensão uuid-ossp
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Criar enum para roles
    await queryRunner.query(`
      CREATE TYPE "public"."role_name_enum" AS ENUM(
        'SUPER_ADMIN', 
        'ORGANIZATION_ADMIN', 
        'PLACE_ADMIN', 
        'COMPANY_ADMIN', 
        'COMPANY_STAFF', 
        'PUBLIC_USER'
      )
    `);

    // Criar tabela de organização
    await queryRunner.query(`
      CREATE TABLE "organization" (
        "id" SERIAL NOT NULL,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "description" character varying NOT NULL,
        "logo" character varying,
        "banner" character varying,
        CONSTRAINT "UQ_organization_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_organization_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_organization" PRIMARY KEY ("id")
      )
    `);

    // Criar tabela de place
    await queryRunner.query(`
      CREATE TABLE "place" (
        "id" SERIAL NOT NULL,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "description" character varying NOT NULL,
        "city" character varying NOT NULL,
        "state" character varying NOT NULL,
        "neighborhood" character varying,
        "postalCode" character varying,
        "latitude" decimal(10,7),
        "longitude" decimal(10,7),
        "logo" character varying,
        "banner" character varying,
        "organizationId" integer NOT NULL,
        CONSTRAINT "UQ_place_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_place_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_place" PRIMARY KEY ("id")
      )
    `);

    // Criar tabela de empresa
    await queryRunner.query(`
      CREATE TABLE "company" (
        "id" SERIAL NOT NULL,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "description" character varying NOT NULL,
        "phone" character varying,
        "email" character varying,
        "website" character varying,
        "address" character varying,
        "latitude" decimal(10,7),
        "longitude" decimal(10,7),
        "openingHours" character varying,
        "logo" character varying,
        "banner" character varying,
        "cnpj" character varying,
        "placeId" integer NOT NULL,
        CONSTRAINT "UQ_company_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_company_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_company" PRIMARY KEY ("id")
      )
    `);

    // Criar tabela de role
    await queryRunner.query(`
      CREATE TABLE "role" (
        "id" SERIAL NOT NULL,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "name" "public"."role_name_enum" NOT NULL DEFAULT 'PUBLIC_USER',
        "description" character varying NOT NULL,
        CONSTRAINT "UQ_role_uuid" UNIQUE ("uuid"),
        CONSTRAINT "PK_role" PRIMARY KEY ("id")
      )
    `);

    // Criar tabela de usuário
    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" SERIAL NOT NULL,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "name" character varying NOT NULL,
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "phone" character varying,
        "avatar" character varying,
        "isVerified" boolean NOT NULL DEFAULT false,
        "verificationToken" character varying,
        "resetPasswordToken" character varying,
        "tokenExpiration" TIMESTAMP,
        "lastLogin" TIMESTAMP,
        "organizationId" integer,
        "placeId" integer,
        "companyId" integer,
        CONSTRAINT "UQ_user_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_user_email" UNIQUE ("email"),
        CONSTRAINT "PK_user" PRIMARY KEY ("id")
      )
    `);

    // Criar tabela de relacionamento user_role
    await queryRunner.query(`
      CREATE TABLE "user_role" (
        "id" SERIAL NOT NULL,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "userId" integer NOT NULL,
        "roleId" integer NOT NULL,
        CONSTRAINT "UQ_user_role_uuid" UNIQUE ("uuid"),
        CONSTRAINT "PK_user_role" PRIMARY KEY ("id")
      )
    `);

    // Adicionar chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "place" ADD CONSTRAINT "FK_place_organization" 
      FOREIGN KEY ("organizationId") REFERENCES "organization"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "company" ADD CONSTRAINT "FK_company_place" 
      FOREIGN KEY ("placeId") REFERENCES "place"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "user" ADD CONSTRAINT "FK_user_organization" 
      FOREIGN KEY ("organizationId") REFERENCES "organization"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "user" ADD CONSTRAINT "FK_user_place" 
      FOREIGN KEY ("placeId") REFERENCES "place"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "user" ADD CONSTRAINT "FK_user_company" 
      FOREIGN KEY ("companyId") REFERENCES "company"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "user_role" ADD CONSTRAINT "FK_user_role_user" 
      FOREIGN KEY ("userId") REFERENCES "user"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "user_role" ADD CONSTRAINT "FK_user_role_role" 
      FOREIGN KEY ("roleId") REFERENCES "role"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Inserir roles padrão
    await queryRunner.query(`
      INSERT INTO "role" ("name", "description") VALUES
      ('SUPER_ADMIN', 'Administrador do sistema com acesso completo'),
      ('ORGANIZATION_ADMIN', 'Administrador de organização'),
      ('PLACE_ADMIN', 'Administrador de local'),
      ('COMPANY_ADMIN', 'Administrador de empresa'),
      ('COMPANY_STAFF', 'Funcionário de empresa'),
      ('PUBLIC_USER', 'Usuário público')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover chaves estrangeiras
    await queryRunner.query(`ALTER TABLE "user_role" DROP CONSTRAINT "FK_user_role_role"`);
    await queryRunner.query(`ALTER TABLE "user_role" DROP CONSTRAINT "FK_user_role_user"`);
    await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_user_company"`);
    await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_user_place"`);
    await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_user_organization"`);
    await queryRunner.query(`ALTER TABLE "company" DROP CONSTRAINT "FK_company_place"`);
    await queryRunner.query(`ALTER TABLE "place" DROP CONSTRAINT "FK_place_organization"`);

    // Remover tabelas
    await queryRunner.query(`DROP TABLE "user_role"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TABLE "role"`);
    await queryRunner.query(`DROP TABLE "company"`);
    await queryRunner.query(`DROP TABLE "place"`);
    await queryRunner.query(`DROP TABLE "organization"`);

    // Remover enum
    await queryRunner.query(`DROP TYPE "public"."role_name_enum"`);
  }
}
