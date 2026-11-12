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
