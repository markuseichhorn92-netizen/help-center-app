export function formatMessageContent(content: string | null | undefined, channel?: string): string {
  // Handle null/undefined content
  if (!content) {
    return '';
  }

  // Ensure content is a string
  const strContent = String(content);

  // WhatsApp messages are ALWAYS plain text - strip any HTML tags
  if (channel === 'whatsapp') {
    // Remove all HTML tags (they shouldn't be there for WhatsApp)
    const plainText = strContent.replace(/<[^>]*>/g, '');
    // Escape any remaining special characters and convert newlines
    return plainText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br />');
  }

  // For email/web: If content has HTML tags, render as HTML
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(strContent);
  if (hasHtmlTags) {
    return strContent;
  }

  // Plain text - escape HTML and convert newlines
  return strContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br />');
}
