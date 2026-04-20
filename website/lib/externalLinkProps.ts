/** Use on <a> for http(s) and mailto links so they open in a new tab (in-page # anchors unchanged). */
export function externalLinkProps(href: string): { target?: '_blank'; rel?: string } {
  if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href)) {
    return { target: '_blank', rel: 'noopener noreferrer' };
  }
  return {};
}
