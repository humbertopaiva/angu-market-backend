// src/migrations/1717182000000-CreateCompanyDeliverySimple.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompanyDeliverySimple1717182000000 implements MigrationInterface {
  name = 'CreateCompanyDeliverySimple1717182000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a tabela company existe
    const companyTableExists = await queryRunner.hasTable('company');
    if (!companyTableExists) {
      throw new Error('Tabela company deve existir antes de criar company_delivery');
    }

    // Criar enum para tipos de delivery (simplificado)
    await queryRunner.query(`
      CREATE TYPE "public"."delivery_type_enum" AS ENUM(
        'DELIVERY', 
        'PICKUP', 
        'DINE_IN'
      )
    `);

    // Criar tabela company_delivery (simplificada)
    await queryRunner.query(`
      CREATE TABLE "company_delivery" (
        "id" SERIAL NOT NULL,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "isEnabled" boolean NOT NULL DEFAULT false,
        "availableTypes" "public"."delivery_type_enum"[] NOT NULL DEFAULT '{}',
        "baseFee" decimal(8,2) NOT NULL DEFAULT 0,
        "freeDeliveryMinValue" decimal(8,2),
        "estimatedTimeMinutes" integer NOT NULL DEFAULT 30,
        "pickupTimeMinutes" integer NOT NULL DEFAULT 15,
        "minimumOrderValue" decimal(8,2),
        "maximumOrderValue" decimal(8,2),
        "acceptsCash" boolean NOT NULL DEFAULT true,
        "acceptsCard" boolean NOT NULL DEFAULT true,
        "acceptsPix" boolean NOT NULL DEFAULT true,
        "deliveryInstructions" text,
        "pickupInstructions" text,
        "deliveryPhone" character varying(500),
        "deliveryWhatsApp" character varying(500),
        "companyId" integer NOT NULL,
        CONSTRAINT "UQ_company_delivery_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_company_delivery_companyId" UNIQUE ("companyId"),
        CONSTRAINT "PK_company_delivery" PRIMARY KEY ("id")
      )
    `);

    // Criar tabela delivery_zone (simplificada - apenas bairros)
    await queryRunner.query(`
      CREATE TABLE "delivery_zone" (
        "id" SERIAL NOT NULL,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "name" character varying(255) NOT NULL,
        "neighborhoods" text NOT NULL,
        "deliveryFee" decimal(8,2) NOT NULL DEFAULT 0,
        "estimatedTimeMinutes" integer NOT NULL DEFAULT 30,
        "minimumOrderValue" decimal(8,2),
        "isEnabled" boolean NOT NULL DEFAULT true,
        "priority" integer NOT NULL DEFAULT 0,
        "description" text,
        "companyId" integer NOT NULL,
        CONSTRAINT "UQ_delivery_zone_uuid" UNIQUE ("uuid"),
        CONSTRAINT "PK_delivery_zone" PRIMARY KEY ("id")
      )
    `);

    // Adicionar chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "company_delivery" ADD CONSTRAINT "FK_company_delivery_company" 
      FOREIGN KEY ("companyId") REFERENCES "company"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "delivery_zone" ADD CONSTRAINT "FK_delivery_zone_company" 
      FOREIGN KEY ("companyId") REFERENCES "company"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Adicionar índices para performance
    await queryRunner.query(`
      CREATE INDEX "IDX_company_delivery_companyId" ON "company_delivery" ("companyId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_company_delivery_isEnabled" ON "company_delivery" ("isEnabled")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_company_delivery_availableTypes" ON "company_delivery" USING GIN ("availableTypes")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_delivery_zone_companyId" ON "delivery_zone" ("companyId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_delivery_zone_isEnabled" ON "delivery_zone" ("isEnabled")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_delivery_zone_priority" ON "delivery_zone" ("priority")
    `);

    // Adicionar constraints de validação
    await queryRunner.query(`
      ALTER TABLE "company_delivery" ADD CONSTRAINT "CHK_delivery_order_values" 
      CHECK (
        ("minimumOrderValue" IS NULL OR "maximumOrderValue" IS NULL OR "minimumOrderValue" < "maximumOrderValue")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "delivery_zone" ADD CONSTRAINT "CHK_zone_neighborhoods_not_empty" 
      CHECK (
        LENGTH(TRIM("neighborhoods")) > 0
      )
    `);

    console.log('✅ Tabelas company_delivery e delivery_zone criadas com sucesso (versão simplificada)');
    console.log('📝 Relacionamentos ONE-TO-ONE e ONE-TO-MANY estabelecidos');
    console.log('🚚 Enum de delivery criado (apenas 3 tipos)');
    console.log('🏘️ Sistema de zonas baseado apenas em bairros');
    console.log('🔒 Constraints de validação adicionadas');
    console.log('⚡ Índices para performance criados');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover constraints
    await queryRunner.query(`ALTER TABLE "delivery_zone" DROP CONSTRAINT IF EXISTS "CHK_zone_neighborhoods_not_empty"`);
    await queryRunner.query(`ALTER TABLE "company_delivery" DROP CONSTRAINT IF EXISTS "CHK_delivery_order_values"`);

    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_delivery_zone_priority"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_delivery_zone_isEnabled"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_delivery_zone_companyId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_delivery_availableTypes"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_delivery_isEnabled"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_delivery_companyId"`);

    // Remover chaves estrangeiras
    await queryRunner.query(`ALTER TABLE "delivery_zone" DROP CONSTRAINT "FK_delivery_zone_company"`);
    await queryRunner.query(`ALTER TABLE "company_delivery" DROP CONSTRAINT "FK_company_delivery_company"`);

    // Remover tabelas
    await queryRunner.query(`DROP TABLE "delivery_zone"`);
    await queryRunner.query(`DROP TABLE "company_delivery"`);

    // Remover enum
    await queryRunner.query(`DROP TYPE "public"."delivery_type_enum"`);
  }
}