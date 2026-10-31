# SYSTEM FORMY — strona sprzedażowa pakietów START / PRO / ELITE

To niezależna, statyczna strona sprzedażowa marki SYSTEM FORMY, przygotowana pod Cloudflare Pages. Prezentuje wyłącznie trzy pakiety głównej oferty:

- SYSTEM START — 99 zł
- SYSTEM PRO — 699 zł (8 tygodni)
- SYSTEM ELITE — 1499 zł (12 tygodni)

Na stronie nie ma e-booków jako osobnej oferty, sklepu cyfrowego, Planu Indywidualnego za 199 zł, kont użytkowników, logowania ani panelu aplikacji. Wykorzystany plik logo pochodzi z logo przesłanego przez właściciela marki; przy przygotowaniu pliku do nagłówka przycięto wyłącznie pusty czarny margines — bez modyfikacji grafiki, kolorów i proporcji znaku.

## Struktura projektu

- `index.html` — pełna strona, treść oferty, porównanie, proces i FAQ.
- `src/styles.css` — responsywny wygląd desktop / tablet / telefon.
- `src/main.js` — menu mobilne, komunikaty zakupu, obsługa przycisków i statusu płatności.
- `assets/system-formy-logo.png` — logo SYSTEM FORMY.
- `functions/api/create-checkout.js` — bezpieczny endpoint Cloudflare Pages przygotowany do Stripe Checkout.
- `wrangler.toml` — ustawienia Cloudflare Pages.

## Wgranie do istniejącego repozytorium

1. Zrób commit lub kopię aktualnego repozytorium.
2. Rozpakuj paczkę i wgraj **zawartość** jej głównego katalogu do głównego katalogu repozytorium `System-formy-pages`.
3. Zastąp pliki o tych samych ścieżkach: `index.html`, `README.md`, `src/main.js`, `src/styles.css`, `assets/system-formy-logo.png`, `functions/api/create-checkout.js` oraz `wrangler.toml`.
4. Upewnij się, że struktura wygląda tak (bez dodatkowego folderu nadrzędnego):

   ```text
   /
   ├── index.html
   ├── README.md
   ├── wrangler.toml
   ├── assets/
   │   └── system-formy-logo.png
   ├── functions/
   │   └── api/
   │       └── create-checkout.js
   └── src/
       ├── main.js
       └── styles.css
   ```

5. Zapisz zmiany jako commit na gałęzi `main`. Podłączony Cloudflare Pages powinien automatycznie utworzyć nowe wdrożenie.

### Co usunąć z poprzedniej wersji

Z poprzedniej strony usuń, jeśli są w repozytorium, pliki `regulamin-placeholder.txt` oraz stare pliki/obrazy używane wyłącznie przez poprzednie sekcje ebooków, opinii lub planu indywidualnego. Jeżeli folder `public/` jest pusty i nie zawiera plików potrzebnych innym częściom projektu, można go usunąć. Nie usuwaj plików repozytorium, których przeznaczenia nie znasz. Nie usuwaj `.git/` ani ustawień GitHub.

W tym projekcie nie są potrzebne `package.json`, komenda build ani instalacja zależności. Cloudflare Pages ma publikować katalog główny (`.`) bez komendy budowania. Nie zmieniaj konfiguracji działającego projektu aplikacji — ta strona jest osobnym projektem Pages.

## Cloudflare Pages

Dla tego repozytorium:

- Framework preset: `None`
- Build command: puste
- Build output directory: `.`
- Root directory: puste (katalog główny repozytorium)

Projekt jest statyczny; funkcja serwerowa w `functions/api/` zostanie obsłużona przez Cloudflare Pages Functions.

## Stripe — ważne zabezpieczenie

Przyciski pakietów są już podłączone do endpointu `/api/create-checkout`, ale **płatności są domyślnie zablokowane**. Endpoint zwraca komunikat o niedostępności dopóki zmienna `CHECKOUT_ENABLED` nie ma wartości tekstowej `true`.

Nie ustawiaj `CHECKOUT_ENABLED=true` tylko po to, aby otworzyć płatności. Najpierw trzeba wdrożyć i przetestować:

1. poprawne produkty/ceny Stripe: `STRIPE_PRICE_START`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ELITE` (endpoint sprawdza, czy kwoty to odpowiednio 99 zł, 699 zł i 1499 zł oraz czy walutą jest PLN);
2. sekret serwerowy `STRIPE_SECRET_KEY` (jako Secret w Cloudflare, nigdy w kodzie ani w GitHubie);
3. webhook Stripe weryfikujący podpis i potwierdzający płatność po stronie serwera;
4. realizację START: automatyczne wydanie właściwych materiałów cyfrowych po potwierdzonej płatności;
5. obsługę zamówień i procesu ankiety początkowej dla PRO / ELITE;
6. testowe zakupy i obsługę płatności nieudanych/anulowanych.

Dopiero po zakończeniu tych elementów i testach można ustawić `CHECKOUT_ENABLED=true`. Na obecnym etapie strona nie tworzy fikcyjnych linków płatniczych i nie pobiera pieniędzy.

## Rzeczy do ustalenia przed uruchomieniem sprzedaży

- dokładny termin przygotowania i przekazania planów PRO / ELITE;
- treść i sposób przekazywania ankiety początkowej;
- rzeczywisty proces dostawy pakietu START;
- dane sprzedawcy, regulamin, polityka prywatności, zasady reklamacji i informacje wymagane przy sprzedaży treści/usług cyfrowych;
- kanał i organizacja kontaktu przez czat oraz zasady dostępności.

Te informacje nie zostały dostarczone w opisie oferty, dlatego strona ich nie wymyśla. FAQ wskazuje nieustalony termin planów indywidualnych wprost.

## Test lokalny

Możesz otworzyć `index.html` bezpośrednio w przeglądarce i sprawdzić wygląd. Endpoint Stripe wymaga wdrożenia na Cloudflare Pages. Bez `CHECKOUT_ENABLED=true` przyciski wyświetlą jasny komunikat, że zakup online nie jest jeszcze uruchomiony.
