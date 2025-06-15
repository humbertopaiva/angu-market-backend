// src/migrations/1717182000000-CreateCompanyDelivery.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompanyDelivery1717182000000 implements MigrationInterface {
  name = 'CreateCompanyDelivery1717182000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a tabela company existe
    const companyTableExists = await queryRunner.hasTable('company');
    if (!companyTableExists) {
      throw new Error('Tabela company deve existir antes de criar company_delivery');
    }

    // Verificar se o enum já existe
    const enumExists = await queryRunner.query(`
      SELECT 1 FROM pg_type WHERE typname = 'delivery_type_enum'
    `);

    // Criar enum apenas se não existir
    if (enumExists.length === 0) {
      await queryRunner.query(`
        CREATE TYPE "public"."delivery_type_enum" AS ENUM(
          'DELIVERY', 
          'PICKUP', 
          'DINE_IN'
        )
      `);
      console.log('✅ Enum delivery_type_enum criado');
    } else {
      console.log('ℹ️  Enum delivery_type_enum já existe');
    }

    // Verificar se a tabela company_delivery já existe
    const companyDeliveryExists = await queryRunner.hasTable('company_delivery');
    
    if (!companyDeliveryExists) {
      // Criar tabela company_delivery
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
      console.log('✅ Tabela company_delivery criada');
    } else {
      console.log('ℹ️  Tabela company_delivery já existe');
    }

    // Verificar se a tabela delivery_zone já existe
    const deliveryZoneExists = await queryRunner.hasTable('delivery_zone');
    
    if (!deliveryZoneExists) {
      // Criar tabela delivery_zone
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
      console.log('✅ Tabela delivery_zone criada');
    } else {
      console.log('ℹ️  Tabela delivery_zone já existe');
    }

    // Verificar e adicionar chaves estrangeiras apenas se não existirem
    const companyDeliveryTable = await queryRunner.getTable('company_delivery');
    if (companyDeliveryTable) {
      const hasCompanyFK = companyDeliveryTable.foreignKeys.some(
        fk => fk.columnNames.includes('companyId') && fk.referencedTableName === 'company'
      );
      
      if (!hasCompanyFK) {
        await queryRunner.query(`
          ALTER TABLE "company_delivery" ADD CONSTRAINT "FK_company_delivery_company" 
          FOREIGN KEY ("companyId") REFERENCES "company"("id") 
          ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        console.log('✅ FK company_delivery -> company criada');
      }
    }

    const deliveryZoneTable = await queryRunner.getTable('delivery_zone');
    if (deliveryZoneTable) {
      const hasCompanyFK = deliveryZoneTable.foreignKeys.some(
        fk => fk.columnNames.includes('companyId') && fk.referencedTableName === 'company'
      );
      
      if (!hasCompanyFK) {
        await queryRunner.query(`
          ALTER TABLE "delivery_zone" ADD CONSTRAINT "FK_delivery_zone_company" 
          FOREIGN KEY ("companyId") REFERENCES "company"("id") 
          ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        console.log('✅ FK delivery_zone -> company criada');
      }
    }

    // Criar índices apenas se não existirem
    const indices = [
      { name: 'IDX_company_delivery_companyId', table: 'company_delivery', column: '"companyId"' },
      { name: 'IDX_company_delivery_isEnabled', table: 'company_delivery', column: '"isEnabled"' },
      { name: 'IDX_company_delivery_availableTypes', table: 'company_delivery', column: '"availableTypes"', type: 'GIN' },
      { name: 'IDX_delivery_zone_companyId', table: 'delivery_zone', column: '"companyId"' },
      { name: 'IDX_delivery_zone_isEnabled', table: 'delivery_zone', column: '"isEnabled"' },
      { name: 'IDX_delivery_zone_priority', table: 'delivery_zone', column: '"priority"' },
    ];

    for (const index of indices) {
      const indexExists = await queryRunner.query(`
        SELECT 1 FROM pg_indexes WHERE indexname = '${index.name}'
      `);
      
      if (indexExists.length === 0) {
        const indexType = index.type ? `USING ${index.type}` : '';
        await queryRunner.query(`
          CREATE INDEX "${index.name}" ON "${index.table}" ${indexType} (${index.column})
        `);
        console.log(`✅ Índice ${index.name} criado`);
      }
    }

    // Adicionar constraints de validação apenas se não existirem
    const companyDeliveryConstraints = await queryRunner.query(`
      SELECT constraint_name FROM information_schema.table_constraints 
      WHERE table_name = 'company_delivery' AND constraint_name = 'CHK_delivery_order_values'
    `);

    if (companyDeliveryConstraints.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "company_delivery" ADD CONSTRAINT "CHK_delivery_order_values" 
        CHECK (
          ("minimumOrderValue" IS NULL OR "maximumOrderValue" IS NULL OR "minimumOrderValue" < "maximumOrderValue")
        )
      `);
      console.log('✅ Constraint CHK_delivery_order_values criada');
    }

    const deliveryZoneConstraints = await queryRunner.query(`
      SELECT constraint_name FROM information_schema.table_constraints 
      WHERE table_name = 'delivery_zone' AND constraint_name = 'CHK_zone_neighborhoods_not_empty'
    `);

    if (deliveryZoneConstraints.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "delivery_zone" ADD CONSTRAINT "CHK_zone_neighborhoods_not_empty" 
        CHECK (
          LENGTH(TRIM("neighborhoods")) > 0
        )
      `);
      console.log('✅ Constraint CHK_zone_neighborhoods_not_empty criada');
    }

    console.log('✅ Migration CreateCompanyDelivery concluída com sucesso');
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
    await queryRunner.query(`ALTER TABLE "delivery_zone" DROP CONSTRAINT IF EXISTS "FK_delivery_zone_company"`);
    await queryRunner.query(`ALTER TABLE "company_delivery" DROP CONSTRAINT IF EXISTS "FK_company_delivery_company"`);

    // Remover tabelas
    await queryRunner.query(`DROP TABLE IF EXISTS "delivery_zone"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "company_delivery"`);

    // Remover enum
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."delivery_type_enum"`);

    console.log('✅ Rollback da migration CreateCompanyDelivery concluído');
  }
}