import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompanySocials1717180000000 implements MigrationInterface {
  name = 'CreateCompanySocials1717180000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a tabela company existe
    const companyTableExists = await queryRunner.hasTable('company');
    if (!companyTableExists) {
      throw new Error('Tabela company deve existir antes de criar company_socials');
    }

    // Criar enum para tipos de redes sociais
    await queryRunner.query(`
      CREATE TYPE "public"."social_network_type_enum" AS ENUM(
        'FACEBOOK', 
        'INSTAGRAM', 
        'TIKTOK', 
        'YOUTUBE', 
        'LINKEDIN', 
        'TWITTER', 
        'WHATSAPP', 
        'TELEGRAM', 
        'PINTEREST', 
        'SNAPCHAT', 
        'WEBSITE', 
        'BLOG', 
        'OUTRAS'
      )
    `);

    // Criar tabela company_socials (agregador)
    await queryRunner.query(`
      CREATE TABLE "company_socials" (
        "id" SERIAL NOT NULL,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "isEnabled" boolean NOT NULL DEFAULT true,
        "socialMediaStrategy" text,
        "primaryContactSocial" character varying(500),
        "showFollowersCount" boolean NOT NULL DEFAULT false,
        "allowMessages" boolean NOT NULL DEFAULT true,
        "socialMediaRules" text,
        "companyId" integer NOT NULL,
        CONSTRAINT "UQ_company_socials_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_company_socials_companyId" UNIQUE ("companyId"),
        CONSTRAINT "PK_company_socials" PRIMARY KEY ("id")
      )
    `);

    // Criar tabela company_social (redes individuais)
    await queryRunner.query(`
      CREATE TABLE "company_social" (
        "id" SERIAL NOT NULL,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "networkType" "public"."social_network_type_enum" NOT NULL,
        "url" character varying(500) NOT NULL,
        "username" character varying(100),
        "displayName" character varying(255),
        "description" text,
        "isVisible" boolean NOT NULL DEFAULT true,
        "displayOrder" integer NOT NULL DEFAULT 0,
        "isPrimary" boolean NOT NULL DEFAULT false,
        "followersCount" integer,
        "lastUpdated" TIMESTAMP,
        "companyId" integer NOT NULL,
        CONSTRAINT "UQ_company_social_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_company_social_network" UNIQUE ("companyId", "networkType"),
        CONSTRAINT "PK_company_social" PRIMARY KEY ("id")
      )
    `);

    // Adicionar chaves estrangeiras
    await queryRunner.query(`
      ALTER TABLE "company_socials" ADD CONSTRAINT "FK_company_socials_company" 
      FOREIGN KEY ("companyId") REFERENCES "company"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "company_social" ADD CONSTRAINT "FK_company_social_company" 
      FOREIGN KEY ("companyId") REFERENCES "company"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Adicionar índices para performance
    await queryRunner.query(`
      CREATE INDEX "IDX_company_socials_companyId" ON "company_socials" ("companyId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_company_social_companyId" ON "company_social" ("companyId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_company_social_networkType" ON "company_social" ("networkType")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_company_social_isVisible" ON "company_social" ("isVisible")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_company_social_isPrimary" ON "company_social" ("isPrimary")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_company_social_followersCount" ON "company_social" ("followersCount")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_company_social_displayOrder" ON "company_social" ("displayOrder")
    `);

    // Adicionar constraint para garantir que apenas uma rede social por empresa seja primária
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_company_social_primary_unique" 
      ON "company_social" ("companyId") 
      WHERE "isPrimary" = true
    `);

    console.log('✅ Tabelas company_socials e company_social criadas com sucesso');
    console.log('📝 Relacionamentos ONE-TO-ONE e ONE-TO-MANY estabelecidos');
    console.log('🌐 Enum de redes sociais criado com 13 opções');
    console.log('🔒 Constraints de unicidade adicionadas');
    console.log('⚡ Índices para performance criados');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índice especial
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_social_primary_unique"`);

    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_social_displayOrder"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_social_followersCount"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_social_isPrimary"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_social_isVisible"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_social_networkType"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_social_companyId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_socials_companyId"`);

    // Remover chaves estrangeiras
    await queryRunner.query(
      `ALTER TABLE "company_social" DROP CONSTRAINT "FK_company_social_company"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_socials" DROP CONSTRAINT "FK_company_socials_company"`,
    );

    // Remover tabelas
    await queryRunner.query(`DROP TABLE "company_social"`);
    await queryRunner.query(`DROP TABLE "company_socials"`);

    // Remover enum
    await queryRunner.query(`DROP TYPE "public"."social_network_type_enum"`);
  }
}
