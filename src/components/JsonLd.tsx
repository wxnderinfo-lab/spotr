// Structured data als JSON-LD. "<" wordt ge-escaped zodat gebruikersinhoud
// het script-blok niet kan afsluiten.
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
