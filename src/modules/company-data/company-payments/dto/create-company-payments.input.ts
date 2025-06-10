import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsEnum,
  ValidateIf,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { PaymentMethodType } from '../enums/payment-method.enum';
import { PixKeyType } from '../enums/pix-key-type.enum';

@InputType()
export class CreateCompanyPaymentsInput {
  @Field(() => [PaymentMethodType])
  @IsArray()
  @IsEnum(PaymentMethodType, { each: true })
  paymentMethods: PaymentMethodType[];

  // Campos PIX - obrigatórios apenas se PIX estiver nos métodos
  @Field({ nullable: true })
  @IsOptional()
  @ValidateIf(o => o.paymentMethods?.includes(PaymentMethodType.PIX))
  @IsString()
  @MaxLength(255, { message: 'Chave PIX deve ter no máximo 255 caracteres' })
  pixKey?: string;

  @Field(() => PixKeyType, { nullable: true })
  @IsOptional()
  @ValidateIf(o => o.paymentMethods?.includes(PaymentMethodType.PIX))
  @IsEnum(PixKeyType)
  pixKeyType?: PixKeyType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Descrição PIX deve ter no máximo 255 caracteres' })
  pixDescription?: string;

  // Informações adicionais
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Informações do cartão devem ter no máximo 1000 caracteres' })
  cardInfo?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Informações do vale devem ter no máximo 1000 caracteres' })
  voucherInfo?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Observações devem ter no máximo 2000 caracteres' })
  notes?: string;

  // Configurações de parcelamento
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  acceptsInstallments?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @ValidateIf(o => o.acceptsInstallments === true)
  @IsNumber()
  @Min(2, { message: 'Número mínimo de parcelas é 2' })
  @Max(24, { message: 'Número máximo de parcelas é 24' })
  maxInstallments?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'Valor mínimo deve ser maior que 0' })
  minimumCardAmount?: number;
}

// Validação customizada para chave PIX
export function validatePixKey(pixKey: string, pixKeyType: PixKeyType): boolean {
  switch (pixKeyType) {
    case PixKeyType.CPF:
      return /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/.test(pixKey);
    case PixKeyType.CNPJ:
      return /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/.test(pixKey);
    case PixKeyType.EMAIL:
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pixKey);
    case PixKeyType.TELEFONE:
      return /^\+?55\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(pixKey);
    case PixKeyType.CHAVE_ALEATORIA:
      return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(pixKey);
    default:
      return false;
  }
}
