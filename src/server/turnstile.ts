import config from './config';
import logger from './logger';

/**
 * Verifies a Cloudflare Turnstile token. Outside production a missing token is
 * accepted so local development works without a Turnstile widget.
 */
export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  if (!token) {
    return process.env.NODE_ENV !== 'production';
  }

  const secret = config.turnstileSecretKey;
  if (!secret) {
    logger.error('CLOUDFLARE_TURNSTILE_SECRET_KEY is not set');
    return false;
  }

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.append('remoteip', ip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
    });
    const result = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
    if (!result.success) {
      logger.warn('Turnstile verification failed', result['error-codes']);
    }
    return result.success;
  } catch (error) {
    logger.error('Turnstile verification request failed:', error);
    return false;
  }
}
