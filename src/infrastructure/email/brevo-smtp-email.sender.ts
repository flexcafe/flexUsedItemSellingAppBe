import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { IEmailSender, SendEmailOptions } from '../../domain/services/email-sender.interface.js';

@Injectable()
export class BrevoSmtpEmailSender implements IEmailSender {
  private readonly logger = new Logger(BrevoSmtpEmailSender.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.getOrThrow<string>('BREVO_SMTP_HOST');
    const port = Number(this.configService.get('BREVO_SMTP_PORT', '587'));
    const user = this.configService.getOrThrow<string>('BREVO_SMTP_USER');
    const pass = this.configService.getOrThrow<string>('BREVO_SMTP_PASS');

    this.fromEmail = this.configService.getOrThrow<string>('BREVO_FROM_EMAIL');
    this.fromName = this.configService.get<string>('BREVO_FROM_NAME', 'FlexCafe');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: { user, pass },
    });
  }

  async send(options: SendEmailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: { name: this.fromName, address: this.fromEmail },
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    // Do not log sensitive content (tokens/OTP). Only log high-level delivery info.
    this.logger.log(`Email sent to ${options.to} (subject: ${options.subject})`);
  }
}

