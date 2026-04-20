/**
 * Public URLs for the marketing site. Read on the server at request time so
 * Docker/Portainer runtime env works. Prefer SIGNIN_URL etc.; NEXT_PUBLIC_* still supported for local .env.
 */
export function getSiteUrls() {
  return {
    signInUrl: process.env.SIGNIN_URL || process.env.NEXT_PUBLIC_SIGNIN_URL || '#contact',
    getStartedUrl: process.env.GETSTARTED_URL || process.env.NEXT_PUBLIC_GETSTARTED_URL || '#contact',
  };
}

export function getWeb3formsAccessKey() {
  return process.env.WEB3FORMS_ACCESS_KEY || process.env.NEXT_PUBLIC_WEB3FORMS_KEY || '';
}
