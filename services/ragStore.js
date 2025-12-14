import {load as loadHtml} from "cheerio";

export function htmlToText(html) {
  const $ = loadHtml(html);
  $('script,style,noscript').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}