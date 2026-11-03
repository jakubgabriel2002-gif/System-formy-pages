SYSTEM FORMY — HERO, ANIMACJE PAKIETÓW I METAMORFOZA TOMKA

Paczka zawiera wyłącznie zwykłe pliki strony — bez skryptów Pythona i bez migracji SQL.

PLIKI DO DODANIA / PODMIANY
1. index.html — pełna nowa wersja strony głównej.
2. src/home-enhancements.css — nowy arkusz stylów; dodaj plik.
3. src/home-animations.js — nowy skrypt animacji kart; dodaj plik.
4. realizacja.html — pełna wersja ekranu realizacji z dodatkowym skryptem pomocy.
5. src/realizacja-support.js — nowy skrypt, który dodaje klikalny adres pomocy przy zablokowanym pobraniu SYSTEM START.
6. assets/metamorfoza-tomek-przed.jpeg — oryginalne zdjęcie przed współpracą.
7. assets/metamorfoza-tomek-po.jpeg — oryginalne zdjęcie po współpracy.

ZACHOWANE
- istniejące ceny, linki do pakietów i mechanizm Stripe;
- istniejący system jednorazowego wyboru/pobrania SYSTEM START;
- aktualny arkusz src/styles.css i logika src/realizacja.js — nie trzeba ich podmieniać;
- zdjęcia Tomka umieszczone bez retuszu i filtrów.

WDROŻENIE
Skopiuj pliki do repozytorium, zachowując ścieżki. Zastąp index.html oraz realizacja.html, dodaj pozostałe pliki i obrazy. Zrób commit i push na main. Cloudflare Pages wykona deployment automatycznie.

UWAGA DOTYCZĄCA ADRESU E-MAIL
W aktualnej stronie kontaktowej znajduje się pomoc@systemformy.com.pl. Tego adresu użyto w komunikacie pomocy (mailto). Jeśli właściwym adresem miał być pomoc@systemform.com.pl bez litery „y”, zmień adres w src/realizacja-support.js przed wdrożeniem.

Po wdrożeniu sprawdź stronę główną na telefonie i komputerze oraz otwórz ekran SYSTEM START po pobraniu, aby sprawdzić klikalny kontakt pomocy.
