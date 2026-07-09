import DOMPurify from 'dompurify';

export const sanitizeHtml = (html) => {
  return DOMPurify.sanitize(html || '', {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'br'],
    ALLOWED_ATTR: []
  });
};

// block-level closing tags and add space after <br>
export const stripHtml = (html) => {
  if (!html) return '';

  const withSpaces = html
    .replace(/<\/(p|div|li|blockquote|pre|h[1-6])>/gi, ' ')  // block end -> space
    .replace(/<br\s*\/?>/gi, ' ');                            // line break -> space

  const div = document.createElement('div');
  div.innerHTML = withSpaces;

  return (div.textContent || div.innerText || '')
    .replace(/\s+/g, ' ')   // multiple spaces collapse
    .trim();
};

export const isHtmlEmpty = (html) => stripHtml(html).length === 0;