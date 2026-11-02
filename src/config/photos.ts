// Categoriefoto's: close-ups van handen en materiaal (geen gezichten).
// Bron: Unsplash, gratis Unsplash-licentie (commercieel gebruik toegestaan,
// naamsvermelding niet verplicht maar wel netjes: zie /fotoverantwoording).
// Omgezet met tools/data/convert-photos.mjs naar 1600x1200 WebP.

export type Photo = { src: string; alt: string; credit: string; creditUrl: string; photoUrl: string };

const u = (path: string) => `https://unsplash.com${path}`;

export const categoryPhotos: Record<string, Photo> = {
  "klussen-en-bouw": { src: "/images/categorie/klussen-en-bouw.webp", alt: "Verfroller in een verfbak", credit: "Roselyn Tirado", creditUrl: u("/@roselyntirado"), photoUrl: u("/photos/person-holding-black-and-silver-hand-tool-e79sQgoMwpA") },
  "tuin-en-buiten": { src: "/images/categorie/tuin-en-buiten.webp", alt: "Handen planten een zaailing in de aarde", credit: "Jonathan Kemper", creditUrl: u("/@jupp"), photoUrl: u("/photos/hands-planting-seedling-in-garden-4z3lnwEvZQw") },
  "schoonmaak-en-huishouden": { src: "/images/categorie/schoonmaak-en-huishouden.webp", alt: "Hand met een gele spons op een vensterbank", credit: "CDC", creditUrl: u("/@cdc"), photoUrl: u("/photos/person-holding-yellow-sponge-on-white-surface-pIn6MMEoK-c") },
  "verhuizen-en-transport": { src: "/images/categorie/verhuizen-en-transport.webp", alt: "Dichtgeplakte kartonnen verhuisdoos", credit: "Brandable Box", creditUrl: u("/@brandablebox"), photoUrl: u("/photos/shallow-focus-photo-of-brown-cardboard-box-8mCsyImZRGY") },
  "foto-video-en-audio": { src: "/images/categorie/foto-video-en-audio.webp", alt: "Videograaf met camera en monitor in rood licht", credit: "Kyle Loftus", creditUrl: u("/@kyleloftusstudios"), photoUrl: u("/photos/man-in-white-t-shirt-holding-black-video-camera-DqmXihYx5UE") },
  "ontwerp-en-content": { src: "/images/categorie/ontwerp-en-content.webp", alt: "Handen op een tekentablet naast kleurstalen", credit: "Theme Photos", creditUrl: u("/@themephotos"), photoUrl: u("/photos/designer-using-tablet-and-laptop-workspace-CGpifH3FjOA") },
  "websites-en-software": { src: "/images/categorie/websites-en-software.webp", alt: "Handen typen op een laptop met code", credit: "Štefan Štefančík", creditUrl: u("/@cikstefan"), photoUrl: u("/photos/person-wearing-long-sleeve-top-working-on-laptop-5p_7M5MP2Iw") },
  "digitale-hulp": { src: "/images/categorie/digitale-hulp.webp", alt: "Handen repareren een telefoon met een schroevendraaier", credit: "Revendo", creditUrl: u("/@revendo"), photoUrl: u("/photos/a-person-using-a-touchscreen-device-Zm0MFn6jWGo") },
  "events-en-styling": { src: "/images/categorie/events-en-styling.webp", alt: "Handen schikken rozen op een donkere tafel", credit: "Viktoriia Yatsentiuk", creditUrl: u("/@gloriaviktoriia"), photoUrl: u("/photos/a-couple-of-people-cutting-flowers-with-scissors--S5dWY4w_ho") },
  "les-en-begeleiding": { src: "/images/categorie/les-en-begeleiding.webp", alt: "Twee handen schrijven samen in een notitieboek", credit: "Cathryn Lavery", creditUrl: u("/@cathrynlavery"), photoUrl: u("/photos/person-writing-on-a-book-fMD_Cru6OTk") },
  dieren: { src: "/images/categorie/dieren.webp", alt: "Hand met een hondenriem, hond in het gras", credit: "Harrison Kugler", creditUrl: u("/@harrisonkugler"), photoUrl: u("/photos/person-holding-black-and-brown-dog-BD9aCnOXobQ") },
  "praktische-hulp": { src: "/images/categorie/praktische-hulp.webp", alt: "Hand schroeft een beugel aan een kast", credit: "Sleepline", creditUrl: u("/@sleepline"), photoUrl: u("/photos/person-using-screwdriver-to-attach-metal-bracket-to-white-surface-nvY2UmZI_Vg") },
};

export const heroPhoto: Photo = { src: "/images/categorie/hero.webp", alt: "Handen tekenen een maat af op een houten plank", credit: "Craft Kitties", creditUrl: u("/@craftkitties"), photoUrl: u("/photos/person-marking-wooden-board-with-pencil-GfYA6q5ESLI") };

/** Foto bij een (sub)categorie: eigen foto of die van de hoofdcategorie. */
export function photoFor(slug: string, parentSlug?: string | null): Photo | null {
  return categoryPhotos[slug] ?? (parentSlug ? categoryPhotos[parentSlug] ?? null : null);
}
