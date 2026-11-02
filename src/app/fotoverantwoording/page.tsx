import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { categoryPhotos, heroPhoto } from "@/config/photos";

export const metadata: Metadata = {
  title: "Fotoverantwoording",
  description: "Wie de foto’s op Jobmarkt maakte en onder welke licentie we ze gebruiken.",
  alternates: { canonical: "/fotoverantwoording" },
};

export default function PhotoCreditsPage() {
  const rows = [["Homepage", heroPhoto] as const, ...Object.entries(categoryPhotos)];
  return (
    <ContentPage crumb="Fotoverantwoording" title="Fotoverantwoording">
      <p>
        De foto’s bij de categorieën komen van <a href="https://unsplash.com" rel="noopener">Unsplash</a> en vallen onder de{" "}
        <a href="https://unsplash.com/license" rel="noopener">Unsplash-licentie</a>. Die staat gebruik op een commerciële site toe; naamsvermelding is niet
        verplicht, maar we doen het graag. Foto’s die professionals zelf uploaden zijn van hen.
      </p>
      <table>
        <thead><tr><th>Waar</th><th>Foto</th><th>Fotograaf</th></tr></thead>
        <tbody>
          {rows.map(([where, p]) => (
            <tr key={p.src}>
              <td>{where === "Homepage" ? where : where.replace(/-en-/g, " & ").replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase())}</td>
              <td><a href={p.photoUrl} rel="noopener">{p.alt}</a></td>
              <td><a href={p.creditUrl} rel="noopener">{p.credit}</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </ContentPage>
  );
}
