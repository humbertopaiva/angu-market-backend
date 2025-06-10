import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { FilterableField } from '@nestjs-query/query-graphql';
import { BaseEntity } from '@/modules/common/entities/base.entity';
import { Company } from '@/modules/companies/entities/company.entity';
import { PaymentMethodType } from '../enums/payment-method.enum';
import { PixKeyType } from '../enums/pix-key-type.enum';

@Entity('company_payments')
@ObjectType('CompanyPayments')
export class CompanyPayments extends BaseEntity {
  // Métodos de pagamento aceitos (array de enums)
  @Column({
    type: 'enum',
    enum: PaymentMethodType,
    array: true,
    default: [],
  })
  @FilterableField(() => [PaymentMethodType])
  @Field(() => [PaymentMethodType])
  paymentMethods: PaymentMethodType[];

  // Dados do PIX (se PIX estiver nos métodos aceitos)
  @Column({ type: 'varchar', length: 255, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  pixKey?: string;

  @Column({
    type: 'enum',
    enum: PixKeyType,
    nullable: true,
  })
  @FilterableField(() => PixKeyType, { nullable: true })
  @Field(() => PixKeyType, { nullable: true })
  pixKeyType?: PixKeyType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  pixDescription?: string; // Descrição/nome para aparecer no PIX

  // Informações adicionais sobre cartões
  @Column({ type: 'text', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  cardInfo?: string; // Informações sobre cartões aceitos (bandeiras, etc.)

  // Informações sobre vales
  @Column({ type: 'text', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  voucherInfo?: string; // Informações sobre vales aceitos (empresas, etc.)

  // Observações gerais sobre pagamentos
  @Column({ type: 'text', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  notes?: string;

  // Se aceita pagamento parcelado
  @Column({ type: 'boolean', default: false })
  @FilterableField()
  @Field()
  acceptsInstallments: boolean;

  // Número máximo de parcelas (se aceita parcelado)
  @Column({ type: 'int', nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  maxInstallments?: number;

  // Valor mínimo para aceitar cartão
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  @FilterableField({ nullable: true })
  @Field({ nullable: true })
  minimumCardAmount?: number;

  // Relacionamento ONE-TO-ONE com Company
  @OneToOne(() => Company, company => company.payments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  @Field(() => Company)
  company: Company;

  @Column({ unique: true })
  @FilterableField()
  @Field()
  companyId: number;
}
