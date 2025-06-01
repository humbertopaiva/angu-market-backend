// src/migrations/1717174000000-AddPasswordResetTokens.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetTokens1717174000000 implements MigrationInterface {
  name = 'AddPasswordResetTokens1717174000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Criar tabela de tokens de recuperação de senha
    await queryRunner.query(`
      CREATE TABLE "password_reset_tokens" (
        "id" SERIAL NOT NULL,
        "uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "userId" integer NOT NULL,
        "token" character varying NOT NULL,
        "used" boolean NOT NULL DEFAULT false,
        "expiresAt" TIMESTAMP NOT NULL,
        CONSTRAINT "UQ_password_reset_tokens_uuid" UNIQUE ("uuid"),
        CONSTRAINT "PK_password_reset_tokens" PRIMARY KEY ("id")
      )
    `);

    // Adicionar chave estrangeira
    await queryRunner.query(`
      ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "FK_password_reset_tokens_user" 
      FOREIGN KEY ("userId") REFERENCES "user"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Adicionar índices para performance
    await queryRunner.query(`
      CREATE INDEX "IDX_password_reset_tokens_token" ON "password_reset_tokens" ("token")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_password_reset_tokens_userId" ON "password_reset_tokens" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_password_reset_tokens_used" ON "password_reset_tokens" ("used")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`DROP INDEX "IDX_password_reset_tokens_used"`);
    await queryRunner.query(`DROP INDEX "IDX_password_reset_tokens_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_password_reset_tokens_token"`);

    // Remover chave estrangeira
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "FK_password_reset_tokens_user"`,
    );

    // Remover tabela
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
  }
}
