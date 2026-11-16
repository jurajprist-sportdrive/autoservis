# AUTOSERVIS TOMI – admin dokumenty

Rozšírenie existujúceho statického admin panelu. Otvorte /admin/ na webhostingu. V detaile zákazky sú nové editovateľné dokumenty: obhliadka, cenová ponuka, prijímací/odovzdávací protokol, zákaznícky a technický zákazkový list. V sekciách Obhliadky a Cenové ponuky sú aj priame odkazy. Dokumenty sa ukladajú do existujúceho localStorage demo záznamu zákazky; tlač/PDF využíva dialóg prehliadača. Pečiatka je len na zákazníckej CP a zákazníckom zákazkovom liste.

## Obmedzenia tejto verzie
- Existujúci systém je demo bez serverovej databázy a reálneho zabezpečenia rolí; výber roly v prehliadači **nie je autentifikácia**. Technický mobilný prístup a oprávnenia treba vytvoriť na serveri pred ostrým nasadením.
- Editor dokumentov je pripojený k existujúcim zákazkám. Plnohodnotný nový proces obhliadka → ponuka → schválenie → automatické založenie zákazky zatiaľ **nie je implementovaný**.
- Tlač využíva tlačové okno prehliadača (Uložiť ako PDF), nie samostatný PDF generátor. Pri prijímacom protokole je cieľ A4; dlhé poznámky môžu tlač predĺžiť.
- Úpravy položiek v editore dokumentov sa ukladajú v `documents` pri zákazke; zatiaľ neprepíšu automaticky pôvodné cenové položky zákazky ani výpočty Ekonomiky. Tie zostávajú v existujúcej logike.
- Hlasový vstup zatiaľ nie je implementovaný.
- Pred nahratím zálohujte aktuálne dáta; localStorage sa viaže na konkrétnu doménu a prehliadač.

## Úprava 16.11. – ceny a farebná tlač
- Typ zákazníka sa pre cenovú ponuku a zákaznícky zákazkový list automaticky berie z karty zákazníka (FO/Firma). Nepridáva sa ďalší prepínač.
- FO: v editore aj v tlači je len jeden stĺpec „Cena“; Firma: „Cena bez DPH“ a „Cena s DPH“.
- Farebná tlač/PDF má logo AUTOSERVIS TOMI vľavo a údaje AC7-SK, s.r.o. vpravo, rovnako na všetkých dokumentoch; tlačové farby sú explicitne nastavené. V dialógu tlače môže byť nutné zapnúť „Grafika na pozadí“.
- Existujúce ekonomické výpočty nie sú týmto vydaním zmenené; integrácia editora do ekonomiky zostáva otvorená.
