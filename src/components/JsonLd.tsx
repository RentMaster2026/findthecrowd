/**
 * Structured data, rendered server side into the page.
 *
 * Next strips unknown script types from the React tree unless the content is
 * set this way. The data is generated from our own typed objects, never from
 * user input, so there is nothing here for anyone to inject into.
 */
export function JsonLd({ data }: { data: unknown }) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
