// src/modules/common/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

interface SendPasswordResetParams {
  to: string;
  resetToken: string;
  userName: string;
}

interface SendVerificationEmailParams {
  to: string;
  verificationToken: string;
  userName: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;

  constructor(private configService: ConfigService) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');

    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
      this.logger.log('Resend email service initialized');
    } else {
      this.logger.warn('RESEND_API_KEY not found, falling back to console logging');
    }
  }

  async sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
    try {
      if (this.resend) {
        const fromEmail = this.configService.get<string>('MAIL_FROM') || 'contato@angumarket.com';

        this.logger.log(`Attempting to send email from ${fromEmail} to ${to}`);

        const { data, error } = await this.resend.emails.send({
          from: `Angu Market <${fromEmail}>`,
          to: [to],
          subject,
          html,
        });

        if (error) {
          this.logger.error(`Failed to send email: ${error.message}`);
          return false;
        }

        this.logger.log(`Email sent to ${to}: ${data?.id}`);
        return true;
      } else {
        // Fallback para ambiente de desenvolvimento sem API key do Resend
        this.logger.debug(`[DEV MODE] Email would be sent to: ${to}`);
        this.logger.debug(`[DEV MODE] Subject: ${subject}`);
        this.logger.debug(`[DEV MODE] Content: ${html}`);
        return true;
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to send email: ${error.message}`);
        this.logger.error(error.stack);
      } else {
        this.logger.error(`Failed to send email: Unknown error`);
      }
      return false;
    }
  }

  async sendPasswordResetEmail({
    to,
    resetToken,
    userName,
  }: SendPasswordResetParams): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password/${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4f46e5; text-align: center;">Recuperação de Senha</h1>
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-top: 20px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b;">Olá, ${userName}!</h2>
          <p style="font-size: 16px; color: #475569; line-height: 1.6;">
            Você solicitou a recuperação de senha para sua conta no Angu Market.
          </p>
          <p style="font-size: 16px; color: #475569; line-height: 1.6;">
            Por favor, clique no botão abaixo para criar uma nova senha. Este link é válido por 1 hora.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Redefinir Senha
            </a>
          </div>
          <p style="font-size: 14px; color: #64748b;">
            Se você não solicitou esta recuperação de senha, ignore este email.
          </p>
          <p style="font-size: 14px; color: #64748b;">
            Por segurança, este link expirará em 1 hora.
          </p>
        </div>
        <p style="text-align: center; margin-top: 20px; color: #64748b; font-size: 14px;">
          Este é um email automático da plataforma Angu Market.
          Por favor, não responda a este email.
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: 'Recuperação de Senha - Angu Market',
      html,
    });
  }

  async sendVerificationEmail({
    to,
    verificationToken,
    userName,
  }: SendVerificationEmailParams): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const verificationLink = `${frontendUrl}/verify-email/${verificationToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4f46e5; text-align: center;">Bem-vindo ao Angu Market! 🎉</h1>
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-top: 20px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b;">Olá, ${userName}!</h2>
          <p style="font-size: 16px; color: #475569; line-height: 1.6;">
            Obrigado por se cadastrar no Angu Market! Para começar a usar nossa plataforma, 
            você precisa verificar seu endereço de email.
          </p>
          <p style="font-size: 16px; color: #475569; line-height: 1.6;">
            Clique no botão abaixo para confirmar seu email e ativar sua conta:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Verificar Email
            </a>
          </div>
          <p style="font-size: 14px; color: #64748b;">
            Se você não se cadastrou no Angu Market, ignore este email.
          </p>
          <p style="font-size: 14px; color: #64748b;">
            Por segurança, este link expirará em 24 horas.
          </p>
        </div>
        <p style="text-align: center; margin-top: 20px; color: #64748b; font-size: 14px;">
          Este é um email automático da plataforma Angu Market.
          Por favor, não responda a este email.
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: 'Confirme seu email - Angu Market',
      html,
    });
  }

  async sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4f46e5; text-align: center;">Conta Verificada com Sucesso! ✅</h1>
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-top: 20px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b;">Parabéns, ${userName}!</h2>
          <p style="font-size: 16px; color: #475569; line-height: 1.6;">
            Sua conta foi verificada com sucesso! Agora você pode aproveitar todos os recursos 
            da nossa plataforma.
          </p>
          <p style="font-size: 16px; color: #475569; line-height: 1.6;">
            Explore empresas locais, descubra novos produtos e serviços em sua região.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #059669; font-weight: bold; font-size: 18px;">
              Bem-vindo ao Angu Market! 🚀
            </p>
          </div>
        </div>
        <p style="text-align: center; margin-top: 20px; color: #64748b; font-size: 14px;">
          Este é um email automático da plataforma Angu Market.
          Por favor, não responda a este email.
        </p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: 'Bem-vindo ao Angu Market!',
      html,
    });
  }
}
