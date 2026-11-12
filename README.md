# AUTOSERVIS TOMI – web + admin (prvá verzia)

Statický web pripravený pre **GitHub + Netlify**. Žiadny build ani npm nie sú potrebné.

## Spustenie

- Verejný web: `/index.html`
- Admin panel: `/admin/` (alebo `/admin/index.html`)
- Lokálne testovanie: `python -m http.server 8080` a otvoriť `http://localhost:8080/`.
- Na Netlify: pripojiť GitHub repozitár, **Publish directory:** `.`; build command nechať prázdny. Prípadne nahrať celý obsah rozbaleného ZIP cez Netlify Drop.

## Čo funguje v demo režime

- Verejný responzívny web, deväť servisných oblastí, formulár rezervácie.
- Admin dashboard, rezervácie, zákazníci, vozidlá, zákazky, prideľovanie mechanikov.
- Obhliadka, cenové ponuky, nákupné a predajné ceny dielov, percentuálna úprava cien.
- Požiadavky mechanikov na diely, stavy a upozornenia.
- Mobilný pohľad mechanika, štart/stop, história práce a CSV export.
- Denný plánovací kalendár, ekonomika ukončených zákaziek, fixné náklady, CSV export.
- Prijímací a odovzdávací protokol, tlač / Uložiť ako PDF cez prehliadač, e-mailový koncept.
- Export/import demo dát JSON.

## Kritické obmedzenia pred ostrou prevádzkou

1. **Neexistuje backend ani databáza.** Dáta sú v `localStorage` každého prehliadača; rôzni zamestnanci ich nevidia spoločne. Zmena prehliadača alebo vymazanie dát ich môže stratiť.
2. **Žiadne bezpečné prihlásenie.** Prepínanie rolí je len ukážka UI, nie bezpečnostná ochrana. Nezadávajte reálne osobné údaje zákazníkov do tejto verzie.
3. **E-maily sa automaticky neposielajú.** `mailto:` otvorí e-mailový klient a PDF sa musí priložiť ručne. Na produkciu treba serverovú e-mailovú službu.
4. **PDF cez tlač prehliadača**, nie automatický serverový dokument.
5. **Časovač je len demonštračný.** Nie je serverový ani odolný voči obnoveniu stránky.
6. **DPH a účtovné výpočty nie sú dokončené.** Ekonomika používa zadané sumy ako porovnateľné interné hodnoty a nemá účtovné/daňové spracovanie. Pravidlá DPH, fakturáciu a zákonnú evidenciu tržieb treba dopracovať s účtovníkom.
7. **Kalendár je denný základ.** Presné hodinové bloky, týždeň/mesiac, drag-and-drop a kolízie sú na ďalšiu iteráciu.
8. Neobsahuje produkčné API pre SMS, hlasový prepis, sklad, dochádzku, podpisy ani platby.

## Odporúčaná ďalšia etapa

Backend (napr. Supabase/PostgreSQL), bezpečné roly (admin/technik/mechanik), audit log, databázové transakcie, bezpečné úložisko fotiek a dokumentov, serverové časovače, Netlify Functions pre e-mail, validácia DPH a produkčné testy.

## Štruktúra

```
index.html              verejný web
admin/index.html        admin panel
assets/style.css        spoločný dizajn
assets/shared.js        demo databáza a pomocné funkcie
assets/admin.js         logika adminu
netlify.toml            Netlify konfigurácia
```


## Aktualizácia – vozidlá a zákazky
- Dashboard: 5 stavov a celkový počet áut v areáli.
- Vozidlá v areáli: samostatný zoznam, počítanie dní od prijatia a od dokončenia opravy (kalendárne dni vrátane prvého dňa).
- Zákazky: fulltext podľa čísla, zákazníka/firmy, ŠPZ, auta, stručného popisu; filter podľa prác a stavu.
- Stručný popis opravy: automatický návrh podľa popisu, dielov a obhliadky, potvrdenie/upravenie technikom.
- Prítomnosť je evidovaná bez konkrétneho miesta parkovania.
- DEMO používa localStorage jedného prehliadača; nejde o produkčnú databázu.


## História zákaziek
Samostatná záložka História zákaziek podporuje import JSON/CSV, vyhľadávanie, detail pôvodného záznamu a editovateľný stručný popis. Pôvodné zákazky z Provax nie sú súčasťou ZIP: na ich získanie treba samostatný export z prihlásenej aplikácie. Údaje sa ukladajú iba do localStorage daného prehliadača. Nezadávajte prihlasovacie heslo do statického webu.


## Aktualizácia zoznamov
- Zákazky: jeden riadok na zákazku v poradí číslo / dátum prijatia / zákazník / ŠPZ / vozidlo / stručný popis / cena.
- Okamžité fulltextové filtrovanie pri písaní a nezávislé zaškrtávacie filtre Aktívne / Ukončené (možno zvoliť oba).
- Kliknutie na riadok otvorí existujúci detail zákazky.
- Zákazníci a vozidlá: klikateľné riadky a editovateľné modálne formuláre vrátane platností vozidla.
- Toto je stále prototyp s lokálnym úložiskom prehliadača; automatické e-maily vyžadujú backend.


## Nová aktualizácia
- Zákazník FO: meno, adresa, telefón, e-mail. Firma: navyše IČO, DIČ, IČ DPH, zodpovedná osoba.
- Vozidlo: majiteľ z databázy, ŠPZ, značka/model, VIN, km, výkon kW, rok výroby, objem motora a platnosti.
- Zákazky: detail má karty Prehľad, Zákazka, Obhliadka, CP a diely, Potrebujem diel, História, Ukončiť zákazku.
- Cenová ponuka: samostatné riadky dielov a práce, každá položka Upraviť / Potvrdiť / Zrušiť, hromadné Potvrdiť všetko.
- Potvrdené položky sa synchronizujú do zákazkového listu; súhrn cien bez DPH a s DPH.
- Cenové ponuky sa otvárajú samostatne bez ostatných kariet zákazky.
- Ukončenie zákazky: faktúra (číslo) alebo hotovosť, oddelené potvrdenie odovzdania auta.
- Nové požiadavky na diely označené červeným výkričníkom.
- Fotografie zákazky sú lokálne demo úložisko s obmedzením veľkosti.
- Upozornenie: demo v localStorage, nie ostrý backend. Daňové výpočty, migrácia historických dát a spracovanie súborov vyžadujú pred produkciou kontrolu.

## Aktualizácia: pracovný proces zákazky (12.11.2026)
Nová zákazka: pridanie zákazníka/vozidla, vyhľadávanie, väzba majiteľa, povinné km, otvorenie detailu. Poradie kariet: Prehľad, Obhliadka, CP, Zákazka, Potrebujem diel, História, Ukončiť. Dva PDF zákazkové listy (technik/zákazník), tlač CP, samostatná editácia položiek zákazky, odporúčania, fotografie a dokumenty, tabuľka obhliadok, ekonomický súhrn.

**DÔLEŽITÉ:** Prototype používa localStorage, nie databázu. PDF tlač cez dialóg prehliadača. Firemné údaje dodávateľa je nutné doplniť pred reálnou tlačou. Nejde o produkčne zabezpečený systém.
