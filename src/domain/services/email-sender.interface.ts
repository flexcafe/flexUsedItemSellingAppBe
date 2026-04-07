export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface IEmailSender {
  send(options: SendEmailOptions): Promise<void>;
}

export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

