import { jest } from '@jest/globals';
import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SMSPohRestSmsSender } from './smspoh-rest-sms.sender.js';

describe('SMSPohRestSmsSender', () => {
  const fetchMock = jest.fn<typeof fetch>();
  const originalTestMode = process.env.SMSPOH_TEST;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    delete process.env.SMSPOH_TEST;
  });

  afterAll(() => {
    if (originalTestMode === undefined) {
      delete process.env.SMSPOH_TEST;
    } else {
      process.env.SMSPOH_TEST = originalTestMode;
    }
  });

  function buildSender(overrides: Record<string, string> = {}) {
    return new SMSPohRestSmsSender(
      new ConfigService({
        SMSPOH_API_KEY: 'api-key',
        SMSPOH_API_SECRET: 'api-secret',
        SMSPOH_SENDER_ID: 'FlexCafe',
        ...overrides,
      }),
    );
  }

  it('sends a V3 JSON request with Bearer Base64 credentials', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          messages: [
            {
              messageId: 'message-1',
              message: 'OTP message',
              to: '+959123456789',
              clientReference: 'otp-1',
              scheduledAt: null,
              createdAt: '2026-08-08T00:00:00.000Z',
              messageCount: 1,
              from: 'FlexCafe',
              network: 'MPT',
              type: 'SMS',
              status: 'Accepted',
              test: false,
            },
          ],
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await buildSender().send({
      to: '+959123456789',
      message: 'OTP message',
      clientReference: 'otp-1',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://v3.smspoh.com/api/rest/send',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Buffer.from('api-key:api-secret').toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: '+959123456789',
          message: 'OTP message',
          from: 'FlexCafe',
          clientReference: 'otp-1',
        }),
      }),
    );
  });

  it('includes the provider-required numeric test field in test mode', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          messages: [
            {
              messageId: 'test-1',
              to: '09123456789',
              status: 'Accepted',
            },
          ],
        }),
        { status: 201 },
      ),
    );

    await buildSender({ SMSPOH_TEST: 'true' }).send({
      to: '09123456789',
      message: 'test',
    });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string)).toMatchObject({ test: 1 });
  });

  it('throws the provider message for non-2xx responses', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          name: 'Unauthorized',
          message: 'Invalid API credentials',
          code: 40101,
        }),
        { status: 401 },
      ),
    );

    await expect(
      buildSender().send({ to: '+959123456789', message: 'test' }),
    ).rejects.toThrow(BadGatewayException);
  });

  it('throws service unavailable when SMSPoh cannot be reached', async () => {
    fetchMock.mockRejectedValue(new Error('connect timeout'));

    await expect(
      buildSender().send({ to: '+959123456789', message: 'test' }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('rejects client references longer than SMSPoh maximum', async () => {
    await expect(
      buildSender().send({
        to: '+959123456789',
        message: 'test',
        clientReference: 'x'.repeat(51),
      }),
    ).rejects.toThrow('must not exceed 50 characters');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
