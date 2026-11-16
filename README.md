# AUTOSERVIS TOMI – admin dokumenty

Rozšírenie existujúceho statického admin panelu. Otvorte /admin/ na webhostingu. V detaile zákazky sú nové editovateľné dokumenty: obhliadka, cenová ponuka, prijímací/odovzdávací protokol, zákaznícky a technický zákazkový list. V sekciách Obhliadky a Cenové ponuky sú aj priame odkazy. Dokumenty sa ukladajú do existujúceho localStorage demo záznamu zákazky; tlač/PDF využíva dialóg prehliadača. Pečiatka je len na zákazníckej CP a zákazníckom zákazkovom liste.

## Obmedzenia tejto verzie
- Existujúci systém je demo bez serverovej databázy a reálneho zabezpečenia rolí; výber roly v prehliadači **nie je autentifikácia**. Technický mobilný prístup a oprávnenia treba vytvoriť na serveri pred ostrým nasadením.
- Editor dokumentov je pripojený k existujúcim zákazkám. Plnohodnotný nový proces obhliadka → ponuka → schválenie → automatické založenie zákazky zatiaľ **nie je implementovaný**.
- Tlač využíva tlačové okno prehliadača (Uložiť ako PDF), nie samostatný PDF generátor. Pri prijímacom protokole je cieľ A4; dlhé poznámky môžu tlač predĺžiť.
- Úpravy položiek v editore dokumentov sa ukladajú v `documents` pri zákazke; zatiaľ neprepíšu automaticky pôvodné cenové položky zákazky ani výpočty Ekonomiky. Tie zostávajú v existujúcej logike.
- Hlasový vstup zatiaľ nie je implementovaný.
- Pred nahratím zálohujte aktuálne dáta; localStorage sa viaže na konkrétnu doménu a prehliadač.
