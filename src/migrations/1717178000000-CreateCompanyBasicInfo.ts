import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompanyBasicInfo1717178000000 implements MigrationInterface {
  name = 'CreateCompanyBasicInfo1717178000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a tabela company existe
    const companyTableExists = await queryRunner.hasTable('company');
    if (!companyTableExists) {
      throw new Error('Tabela company deve existir antes de criar company_basic_info');
    }

    // Criar tabela company_basic_info
    await queryRunner.query(`
      CREATE TABLE "company_basic_info" (
        "id" SERIAL NOT NULL,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "description" text,
        "phone" character varying(20),
        "whatsapp" character varying(20),
        "email" character varying(255),
        "address" text,
        "logo" character varying(500),
        "banner" character varying(500),
        "companyId" integer NOT NULL,
        CONSTRAINT "UQ_company_basic_info_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_company_basic_info_companyId" UNIQUE ("companyId"),
        CONSTRAINT "PK_company_basic_info" PRIMARY KEY ("id")
      )
    `);

    // Adicionar chave estrangeira
    await queryRunner.query(`
      ALTER TABLE "company_basic_info" ADD CONSTRAINT "FK_company_basic_info_company" 
      FOREIGN KEY ("companyId") REFERENCES "company"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Adicionar índices para performance
    await queryRunner.query(`
      CREATE INDEX "IDX_company_basic_info_companyId" ON "company_basic_info" ("companyId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_company_basic_info_email" ON "company_basic_info" ("email")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_company_basic_info_phone" ON "company_basic_info" ("phone")
    `);

    console.log('✅ Tabela company_basic_info criada com sucesso');
    console.log('📝 Relacionamento ONE-TO-ONE com company estabelecido');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_basic_info_phone"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_basic_info_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_basic_info_companyId"`);

    // Remover chave estrangeira
    await queryRunner.query(
      `ALTER TABLE "company_basic_info" DROP CONSTRAINT "FK_company_basic_info_company"`,
    );

    // Remover tabela
    await queryRunner.query(`DROP TABLE "company_basic_info"`);
  }
}
