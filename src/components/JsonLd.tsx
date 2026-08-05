/**
 * Emits a JSON-LD block.
 *
 * The content is our own structured data built from config and venue files —
 * never user input — so serialising it into a script tag is safe. The `<`
 * escape is belt-and-braces against a stray angle bracket in prose closing
 * the script tag early.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
