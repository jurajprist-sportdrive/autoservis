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


## Aktualizácia – práce naviac a upozornenia na diely
- Výrazné tlačidlo PRÁCE NAVIAC v detaile zákazky, editovateľný návrh, položky, zdôvodnenie, PDF a schvaľovanie.
- Pri schválení sa doplnia položky do zákazníckeho dokumentu a pracovného listu, vytvoria sa nemenné snímky verzií zákazkového listu Z... / Z...-1 / Z...-2.
- Zákazník, vozidlo, stav zákazky a stav vozidla oddelene.
- Požiadavky na diely navrchu menu, pri nových požiadavkách červený pulzujúci výstražný panel.
- Demo používa localStorage. Pred nasadením zálohujte údaje. Schválenie je ručné označenie, nie elektronický súhlas zákazníka.


### Aktualizácia upozornení a prác naviac
- Požiadavky na diely: 0 = zelený panel a 0 v trojuholníku; >0 = výrazne pulzujúci červený panel a počet v trojuholníku. Bez duplicitného počítadla.
- Práce naviac: zelené tlačidlo, samostatný PDF protokol, položky sa prenesú do zákazky až po potvrdení schválenia; verzovanie zostáva zachované.

## Aktualizácia: kompaktný detail zákazky
- Odstránené duplicitné horné tlačidlá protokolov a štyri spodné informačné karty.
- Zákazník menším písmom, výrazné vozidlo a EČV; oddelený stav zákazky a vozidla.
- Jeden riadok pre mechanika, úhradu, editovateľné číslo faktúry a zelené tlačidlo Práce naviac.
- Jediná kompaktná lišta dokumentov rozložená na celú šírku.
- Zachované ostatné funkcie vrátane histórie a prehľadu prác naviac.
- Údaje sú stále iba v localStorage; pred nahratím odporúčame zálohu a test na testovacom webe.
