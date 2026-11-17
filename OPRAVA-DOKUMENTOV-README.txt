OPRAVA CHYBAJUCICH DOKUMENTOV (17.11.2026)
Pricina: auth.js nacitaval documents.js a extras.js PRED admin.js.
Tieto doplnky pouzivaju funkcie admin.js, ktore este neexistovali.
Oprava: admin.js -> documents.js -> extras.js -> server-customers.js, sekvencne.
Obsahuje aktualny projekt a ponechava prihlasenie aj serverovych zakaznikov/vozidla.
Po nahrati na GitHub urobte Ctrl+F5. Otvorte existujucu DEMO zakazku:
Dokumenty zakazky -> Obhliadka, Cenova ponuka, Protokol, Zakazkovy list.
POZOR: PDF funkcie su tlac do PDF z prehliadaca; dokumenty su zatial
lokalne viazane na demo zakazky. Ziadne stare lokalne data sa neobnovuju.
Zatial nepouzivajte na realne osobne udaje a dokumenty.
