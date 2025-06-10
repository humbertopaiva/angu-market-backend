import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompanyPayments1717179000000 implements MigrationInterface {
  name = 'CreateCompanyPayments1717179000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verificar se a tabela company existe
    const companyTableExists = await queryRunner.hasTable('company');
    if (!companyTableExists) {
      throw new Error('Tabela company deve existir antes de criar company_payments');
    }

    // Criar enum para métodos de pagamento
    await queryRunner.query(`
      CREATE TYPE "public"."payment_method_type_enum" AS ENUM(
        'PIX', 
        'CARTAO_DEBITO', 
        'CARTAO_CREDITO', 
        'BOLETO', 
        'VALE_ALIMENTACAO', 
        'VALE_REFEICAO', 
        'DINHEIRO'
      )
    `);

    // Criar enum para tipos de chave PIX
    await queryRunner.query(`
      CREATE TYPE "public"."pix_key_type_enum" AS ENUM(
        'CPF', 
        'CNPJ', 
        'EMAIL', 
        'TELEFONE', 
        'CHAVE_ALEATORIA'
      )
    `);

    // Criar tabela company_payments
    await queryRunner.query(`
      CREATE TABLE "company_payments" (
        "id" SERIAL NOT NULL,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "paymentMethods" "public"."payment_method_type_enum"[] NOT NULL DEFAULT '{}',
        "pixKey" character varying(255),
        "pixKeyType" "public"."pix_key_type_enum",
        "pixDescription" character varying(255),
        "cardInfo" text,
        "voucherInfo" text,
        "notes" text,
        "acceptsInstallments" boolean NOT NULL DEFAULT false,
        "maxInstallments" integer,
        "minimumCardAmount" decimal(10,2),
        "companyId" integer NOT NULL,
        CONSTRAINT "UQ_company_payments_uuid" UNIQUE ("uuid"),
        CONSTRAINT "UQ_company_payments_companyId" UNIQUE ("companyId"),
        CONSTRAINT "PK_company_payments" PRIMARY KEY ("id")
      )
    `);

    // Adicionar chave estrangeira
    await queryRunner.query(`
      ALTER TABLE "company_payments" ADD CONSTRAINT "FK_company_payments_company" 
      FOREIGN KEY ("companyId") REFERENCES "company"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Adicionar índices para performance
    await queryRunner.query(`
      CREATE INDEX "IDX_company_payments_companyId" ON "company_payments" ("companyId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_company_payments_paymentMethods" ON "company_payments" USING GIN ("paymentMethods")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_company_payments_pixKey" ON "company_payments" ("pixKey")
    `);

    // Adicionar constraints de validação
    await queryRunner.query(`
      ALTER TABLE "company_payments" ADD CONSTRAINT "CHK_company_payments_pix_validation" 
      CHECK (
        (NOT ('PIX' = ANY("paymentMethods")) OR ("pixKey" IS NOT NULL AND "pixKeyType" IS NOT NULL))
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "company_payments" ADD CONSTRAINT "CHK_company_payments_installments_validation" 
      CHECK (
        (NOT "acceptsInstallments" OR "maxInstallments" IS NOT NULL)
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "company_payments" ADD CONSTRAINT "CHK_company_payments_max_installments_range" 
      CHECK (
        ("maxInstallments" IS NULL OR ("maxInstallments" >= 2 AND "maxInstallments" <= 24))
      )
    `);

    console.log('✅ Tabela company_payments criada com sucesso');
    console.log('📝 Relacionamento ONE-TO-ONE com company estabelecido');
    console.log('💳 Enums de métodos de pagamento e tipos de chave PIX criados');
    console.log('🔒 Constraints de validação adicionadas');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover constraints
    await queryRunner.query(
      `ALTER TABLE "company_payments" DROP CONSTRAINT IF EXISTS "CHK_company_payments_max_installments_range"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_payments" DROP CONSTRAINT IF EXISTS "CHK_company_payments_installments_validation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_payments" DROP CONSTRAINT IF EXISTS "CHK_company_payments_pix_validation"`,
    );

    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_payments_pixKey"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_payments_paymentMethods"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_payments_companyId"`);

    // Remover chave estrangeira
    await queryRunner.query(
      `ALTER TABLE "company_payments" DROP CONSTRAINT "FK_company_payments_company"`,
    );

    // Remover tabela
    await queryRunner.query(`DROP TABLE "company_payments"`);

    // Remover enums
    await queryRunner.query(`DROP TYPE "public"."pix_key_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payment_method_type_enum"`);
  }
}
