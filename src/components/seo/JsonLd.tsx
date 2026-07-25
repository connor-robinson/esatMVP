/**
 * Emits structured data. Kept in a server component so the script is part of
 * the initial HTML payload.
 */
export function JsonLd({ schema }: { schema: object | object[] }) {
  const payload = Array.isArray(schema) ? schema : [schema];

  return (
    <>
      {payload.map((entry, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(entry) }}
        />
      ))}
    </>
  );
}
