// Vertaalt de vaste foutcodes uit de databasefuncties naar nette zinnen.
const messages: Record<string, string> = {
  niet_ingelogd: "Log eerst in.",
  niet_gevonden: "Niet gevonden.",
  geen_toegang: "Je hebt hier geen toegang toe.",
  ongeldige_status: "Dat kan niet in deze status.",
  ongeldige_overgang: "Deze stap past niet bij de huidige status van de opdracht.",
  reden_verplicht: "Geef een korte reden op (minimaal 5 tekens).",
  motivering_verplicht: "Geef een motivering op (minimaal 5 tekens).",
  leeftijd_of_toestemming: "Hiervoor moet je 18 zijn, of 16/17 met bevestigde toestemming van een ouder of voogd.",
  account_geschorst: "Je account is geschorst. Neem contact op als je denkt dat dit niet klopt.",
  categorie_niet_actief: "Deze categorie is niet beschikbaar.",
  plaats_verplicht: "Kies een plaats voor werk op locatie.",
  budget_verplicht: "Vul een budget in of kies ‘in overleg’.",
  te_veel_acties: "Je hebt dit vandaag al vaak gedaan. Probeer het later opnieuw.",
  niet_open: "Deze opdracht staat niet (meer) open.",
  eigen_opdracht: "Je kunt niet reageren op je eigen opdracht.",
  geblokkeerd: "Dit kan niet: een van jullie heeft de ander geblokkeerd.",
  contactgegevens: "Deel geen telefoonnummers, e-mailadressen of links. Contact delen kan na acceptatie, in het privégesprek.",
  categorie_18_plus: "Deze categorie is alleen voor professionals van 18 jaar en ouder.",
  categorie_niet_in_profiel: "Voeg deze categorie eerst toe aan je profiel. Zo krijgen opdrachtgevers alleen passende voorstellen.",
  opdracht_vol: "Deze opdracht heeft al het maximum aantal voorstellen.",
  limiet_bereikt: "Je hebt je 5 gratis voorstellen voor deze maand gebruikt. Volgende maand kan het weer, of kies Pro.",
  portfolio_niet_van_jou: "Je kunt alleen je eigen portfolio meesturen.",
  al_gereageerd: "Je hebt al een voorstel gestuurd voor deze opdracht.",
  niet_mogelijk: "Dat is niet (meer) mogelijk.",
  voorstel_niet_beschikbaar: "Dit voorstel is niet meer beschikbaar.",
  professional_kan_niet: "Deze professional kan op dit moment geen opdrachten aannemen.",
  ongeldig_nummer: "Vul een geldig telefoonnummer in, bijvoorbeeld 06 12345678.",
  niet_afgerond: "Je kunt pas beoordelen als de opdracht is afgerond.",
  termijn_verlopen: "De termijn om te beoordelen is verlopen.",
  geen_deelnemer: "Alleen de opdrachtgever en de gekozen professional kunnen beoordelen.",
  al_beoordeeld: "Je hebt deze opdracht al beoordeeld.",
  nog_niet_gepubliceerd: "Je kunt reageren zodra de beoordeling openbaar is.",
  te_jong: "Jobmarkt is voor mensen van 16 jaar en ouder.",
  geboortedatum_vast: "Je geboortedatum kan niet meer worden gewijzigd. Klopt die niet? Neem contact op.",
  ongeldige_geboortedatum: "Controleer je geboortedatum.",
  naam_te_kort: "Vul een naam in van minimaal 2 tekens.",
  gebruikersnaam_bezet: "Deze profielnaam is al bezet.",
  ongeldig_email: "Vul een geldig e-mailadres in.",
  eigen_email: "Vul het e-mailadres van je ouder of voogd in, niet je eigen adres.",
  niet_nodig: "Toestemming is alleen nodig voor 16- en 17-jarigen.",
  max_categorieen: "Je kunt maximaal 10 categorieën kiezen.",
  ongeldige_bijlage: "Deze bijlage hoort niet bij dit gesprek.",
  antwoord_te_kort: "Je antwoord is te kort.",
  reactie_te_kort: "Je reactie is te kort.",
  lopende_opdracht: "Rond eerst je lopende opdrachten af.",
  abonnement_actief: "Zeg eerst je Pro-abonnement op.",
};

export function errorMessage(e: unknown): string {
  const raw = typeof e === "string" ? e : (e as { message?: string })?.message ?? "";
  const code = raw.split(":")[0].trim();
  if (messages[code]) return messages[code];
  if (raw.includes("row-level security") || raw.includes("permission denied")) return messages.geen_toegang;
  if (raw.includes("duplicate key")) return "Dit bestaat al.";
  if (raw.includes("violates check constraint")) return "Controleer de ingevulde gegevens.";
  return "Er ging iets mis. Probeer het opnieuw.";
}
