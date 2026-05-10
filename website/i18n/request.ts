import { getRequestConfig } from 'next-intl/server';
import type { AppLocale } from './routing';
import { routing } from './routing';

function isAppLocale(value: string | undefined): value is AppLocale {
  return typeof value === 'string' && (routing.locales as readonly string[]).includes(value);
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!isAppLocale(locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
