# AUTOSERVIS TOMI – prihlasovacia brána

Táto aktualizácia zapája existujúci `assets/auth.js` do `/admin/`.
Admin sa nevykreslí, kým Websupport API nepotvrdí platnú reláciu.
Po prihlásení sa načítajú pôvodné skripty dokumentov a admina.
Prihlásenie používa `https://api.autoservistomi.sk/index.php?action=login` a overenie `?action=me`.

## Nasadenie
1. Zálohujte aktuálny GitHub repozitár a údaje prehliadača.
2. Nahrajte súbory z priečinka `autoservis-main/` do koreňa repozitára (nie celý vnorený priečinok).
3. Po nasadení skontrolujte `/admin/` v anonymnom okne.
4. Otestujte platné aj neplatné prihlasovacie údaje, odhlásenie a znovunačítanie stránky.
5. Overte CORS na API pre pôvod `https://autoservistomi.netlify.app`.

POZOR: Toto je iba prihlasovacia brána. Obchodné údaje naďalej používanú localStorage, demo obsah môže byť dostupný v prehliadači. Reálne údaje zákazníkov ešte nevkladajte. Bezpečnostné roly treba presadiť aj na API.
