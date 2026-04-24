export interface SendSmsOptions {
  to: string;
  message: string;
  clientReference?: string;
}

export interface ISmsSender {
  send(options: SendSmsOptions): Promise<void>;
}

export const SMS_SENDER = Symbol('SMS_SENDER');
