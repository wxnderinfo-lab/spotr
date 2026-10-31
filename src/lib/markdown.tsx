import Link from "next/link";
import type { ReactNode } from "react";

// Kleine, veilige Markdown-weergave voor de kennisbank (alleen door beheer
// geschreven). Ondersteunt: ## en ### koppen, alinea's, - en 1. lijsten,
// **vet**, [link](url) en eenvoudige | tabellen |. Geen HTML.

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={`${key}-b${i++}`}>{m[1]}</strong>);
    else {
      const href = m[3];
      if (href.startsWith("/")) out.push(<Link key={`${key}-l${i++}`} href={href}>{m[2]}</Link>);
      else if (/^https:\/\//.test(href)) out.push(<a key={`${key}-a${i++}`} href={href} rel="noopener noreferrer">{m[2]}</a>);
      else out.push(m[2]);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim() !== "");
        if (!lines.length) return null;
        const k = `b${bi}`;
        if (lines[0].startsWith("### ")) return <h3 key={k} id={slug(lines[0].slice(4))}>{inline(lines[0].slice(4), k)}</h3>;
        if (lines[0].startsWith("## ")) return <h2 key={k} id={slug(lines[0].slice(3))}>{inline(lines[0].slice(3), k)}</h2>;
        if (lines.every((l) => /^[-*] /.test(l))) return <ul key={k}>{lines.map((l, i) => <li key={i}>{inline(l.slice(2), `${k}-${i}`)}</li>)}</ul>;
        if (lines.every((l) => /^\d+\. /.test(l))) return <ol key={k}>{lines.map((l, i) => <li key={i}>{inline(l.replace(/^\d+\. /, ""), `${k}-${i}`)}</li>)}</ol>;
        if (lines.every((l) => l.trim().startsWith("|"))) {
          const rows = lines.filter((l) => !/^\|\s*-/.test(l.trim())).map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
          const [head, ...body] = rows;
          return (
            <div key={k} className="overflow-x-auto">
              <table>
                <thead><tr>{head.map((c, i) => <th key={i} scope="col">{inline(c, `${k}-h${i}`)}</th>)}</tr></thead>
                <tbody>{body.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci}>{inline(c, `${k}-${ri}-${ci}`)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          );
        }
        return <p key={k}>{inline(lines.join(" "), k)}</p>;
      })}
    </>
  );
}

export function slug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function headings(source: string) {
  return source.split("\n").filter((l) => l.startsWith("## ")).map((l) => ({ text: l.slice(3), id: slug(l.slice(3)) }));
}
