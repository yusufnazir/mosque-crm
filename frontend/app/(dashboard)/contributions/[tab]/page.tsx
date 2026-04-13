'use client';
// Re-export the contributions page component.
// When rendered here, useParams() returns { tab: 'types' } (or whatever tab is in the URL),
// giving each tab its own browser-history entry and a shareable path like /contributions/payments.
export { default } from '../page';
