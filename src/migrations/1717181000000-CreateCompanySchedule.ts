import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompanySchedule1717181000000 implements MigrationInterface {
  name = 'CreateCompanySchedule1717181000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a tabela company existe
    const companyTableExists = await queryRunner.hasTable('company');
    if (!companyTableExists) {
      throw new Error('Tabela company deve existir antes de criar company_schedule');
    }

    // Criar enum para dias da semana
    await queryRunner.query(`
      CREATE TYPE "public"."day_of_week_enum" AS ENUM(
        'SEGUNDA', 
        'TERCA', 
        'QUARTA', 
        'QUINTA', 
        'SEXTA', 
        'SABADO', 
        'DOMINGO'
      )
    `);

    // Criar enum para tipos de horário
    await queryRunner.query(`
      CREATE TYPE "public"."schedule_type_enum" AS ENUM(
        'REGULAR', 
        'SPECIAL', 
        'HOLIDAY', 
        'VACATION', 
        'TEMPORARY_CLOSURE'
      )
    `);

    // Criar tabela company_schedule (agregador)
    await queryRunner.query(`
      CREATE TABLE "company_schedule" (
        "id" SERIAL NOT NULL,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "timezone" character varying(100),
        "isEnabled" boolean NOT NULL DEFAULT true,
        "allowOnlineScheduling" boolean NOT NULL DEFAULT false,
        "slotDurationMinutes" integer,
        "advanceBookingDays" integer,
        "scheduleNotes" text,
        "holidayMessage" character varying(500),
        "closedMessage" character varying(500),
        "showNextOpenTime" boolean NOT NULL DEFAULT false,
        "autoUpdateStatus" boolean NOT NULL DEFAULT true,
        "hasDeliverySchedule" boolean NOT NULL DEFAULT false,
        "hasTakeoutSchedule" boolean NOT NULL DEFAULT false,
        "companyId" integer NOT NULL,
        CONSTRAINT "UQ_company_schedule_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_company_schedule_companyId" UNIQUE ("companyId"),
        CONSTRAINT "PK_company_schedule" PRIMARY KEY ("id")
      )
    `);

    // Criar tabela company_schedule_hour (horários específicos)
    await queryRunner.query(`
      CREATE TABLE "company_schedule_hour" (
        "id" SERIAL NOT NULL,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "dayOfWeek" "public"."day_of_week_enum" NOT NULL,
        "scheduleType" "public"."schedule_type_enum" NOT NULL DEFAULT 'REGULAR',
        "openTime" time,
        "closeTime" time,
        "isClosed" boolean NOT NULL DEFAULT false,
        "is24Hours" boolean NOT NULL DEFAULT false,
        "breakStartTime" time,
        "breakEndTime" time,
        "notes" character varying(500),
        "specificDate" date,
        "validFrom" date,
        "validUntil" date,
        "priority" integer NOT NULL DEFAULT 0,
        "companyId" integer NOT NULL,
        CONSTRAINT "UQ_company_schedule_hour_uuid" UNIQUE ("uuid"),
        CONSTRAINT "PK_company_schedule_hour" PRIMARY KEY ("id")
      )
    `);

    // Adicionar chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "company_schedule" ADD CONSTRAINT "FK_company_schedule_company" 
      FOREIGN KEY ("companyId") REFERENCES "company"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "company_schedule_hour" ADD CONSTRAINT "FK_company_schedule_hour_company" 
      FOREIGN KEY ("companyId") REFERENCES "company"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Adicionar índices para performance
    await queryRunner.query(`
      CREATE INDEX "IDX_company_schedule_companyId" ON "company_schedule" ("companyId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_company_schedule_hour_companyId" ON "company_schedule_hour" ("companyId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_company_schedule_hour_dayOfWeek" ON "company_schedule_hour" ("dayOfWeek")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_company_schedule_hour_scheduleType" ON "company_schedule_hour" ("scheduleType")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_company_schedule_hour_specificDate" ON "company_schedule_hour" ("specificDate")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_company_schedule_hour_priority" ON "company_schedule_hour" ("priority")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_company_schedule_hour_validFrom" ON "company_schedule_hour" ("validFrom")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_company_schedule_hour_validUntil" ON "company_schedule_hour" ("validUntil")
    `);

    // Adicionar constraints de validação
    await queryRunner.query(`
      ALTER TABLE "company_schedule_hour" ADD CONSTRAINT "CHK_schedule_hour_time_validation" 
      CHECK (
        ("isClosed" = true OR "is24Hours" = true OR ("openTime" IS NOT NULL AND "closeTime" IS NOT NULL))
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "company_schedule_hour" ADD CONSTRAINT "CHK_schedule_hour_break_validation" 
      CHECK (
        (("breakStartTime" IS NULL AND "breakEndTime" IS NULL) OR 
         ("breakStartTime" IS NOT NULL AND "breakEndTime" IS NOT NULL))
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "company_schedule" ADD CONSTRAINT "CHK_schedule_slot_duration" 
      CHECK (
        ("slotDurationMinutes" IS NULL OR ("slotDurationMinutes" >= 15 AND "slotDurationMinutes" <= 480))
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "company_schedule" ADD CONSTRAINT "CHK_schedule_advance_booking" 
      CHECK (
        ("advanceBookingDays" IS NULL OR ("advanceBookingDays" >= 0 AND "advanceBookingDays" <= 365))
      )
    `);

    // Índice único para prevenir duplicatas de horários regulares
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_company_schedule_hour_regular_unique" 
      ON "company_schedule_hour" ("companyId", "dayOfWeek") 
      WHERE "scheduleType" = 'REGULAR'
    `);

    console.log('✅ Tabelas company_schedule e company_schedule_hour criadas com sucesso');
    console.log('📝 Relacionamentos ONE-TO-ONE e ONE-TO-MANY estabelecidos');
    console.log('⏰ Enums de dias da semana e tipos de horário criados');
    console.log('🔒 Constraints de validação adicionadas para horários');
    console.log('⚡ Índices para performance e consultas por data criados');
    console.log('📅 Suporte a horários especiais, feriados e fechamentos temporários');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índice especial
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_schedule_hour_regular_unique"`);

    // Remover constraints
    await queryRunner.query(
      `ALTER TABLE "company_schedule" DROP CONSTRAINT IF EXISTS "CHK_schedule_advance_booking"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_schedule" DROP CONSTRAINT IF EXISTS "CHK_schedule_slot_duration"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_schedule_hour" DROP CONSTRAINT IF EXISTS "CHK_schedule_hour_break_validation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_schedule_hour" DROP CONSTRAINT IF EXISTS "CHK_schedule_hour_time_validation"`,
    );

    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_schedule_hour_validUntil"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_schedule_hour_validFrom"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_schedule_hour_priority"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_schedule_hour_specificDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_schedule_hour_scheduleType"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_schedule_hour_dayOfWeek"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_schedule_hour_companyId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_schedule_companyId"`);

    // Remover chaves estrangeiras
    await queryRunner.query(
      `ALTER TABLE "company_schedule_hour" DROP CONSTRAINT "FK_company_schedule_hour_company"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_schedule" DROP CONSTRAINT "FK_company_schedule_company"`,
    );

    // Remover tabelas
    await queryRunner.query(`DROP TABLE "company_schedule_hour"`);
    await queryRunner.query(`DROP TABLE "company_schedule"`);

    // Remover enums
    await queryRunner.query(`DROP TYPE "public"."schedule_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."day_of_week_enum"`);
  }
}
