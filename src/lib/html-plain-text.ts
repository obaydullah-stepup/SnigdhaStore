const BLOCK_TAGS =
  /<\/(p|div|section|article|header|footer|main|aside|nav|ul|ol|li|h[1-6]|tr|blockquote|pre)>/gi;

const TAG_STRIP = /<[^>]*>/g;

/**
 * Reduces author HTML to plain text for meta descriptions.
 *
 * Only used on strings this module is given, and the output is rendered as a
 * React text child in `generateMetadata`, which escapes it. Script and style
 * bodies are dropped so their source cannot leak into a description.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(BLOCK_TAGS, " ")
    .replace(TAG_STRIP, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}
