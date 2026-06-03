import sanitizeHtml from "sanitize-html";

/** Strip scripts and dangerous markup from book chapter HTML before serving to clients. */
export function sanitizeChapterHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "img",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "figure",
      "figcaption",
      "section",
      "article",
      "header",
      "footer",
      "aside",
      "nav",
      "main",
      "span",
      "div",
    ],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "title", "width", "height"],
      a: ["href", "name", "target", "rel"],
      "*": ["class", "id", "lang", "dir"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
  });
}
