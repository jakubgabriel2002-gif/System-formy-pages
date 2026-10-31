# SYSTEM FORMY — niezależna strona sprzedażowa

To osobna, publiczna strona marki System Formy. W projekcie nie ma logowania, rejestracji, kont użytkowników, panelu administracyjnego ani aplikacji treningowej. W nagłówku i stopce wykorzystano przesłane przez Ciebie logo.

## Pliki i technologia
- `index.html` — strona główna
- `src/styles.css`, `src/main.js` — wygląd i interakcje
- `assets/system-formy-logo.png` — Twoje logo z przezroczystym tłem
- `functions/api/create-checkout.js` — Cloudflare Pages Function tworząca sesję Stripe Checkout
- `wrangler.toml` — konfiguracja projektu Pages/Wrangler

## Wdrożenie na Cloudflare Pages
1. Rozpakuj ZIP na komputerze.
2. Utwórz osobne repozytorium GitHub, np. `system-formy-strona` — nie nadpisuj repozytorium obecnej aplikacji.
3. Wgraj do głównego katalogu repozytorium **zawartość rozpakowanego ZIP-a**. Plik `index.html` ma leżeć bezpośrednio w katalogu głównym repozytorium, a nie w dodatkowym folderze.
4. W Cloudflare Pages utwórz nowy projekt podłączony do tego repozytorium. Ustaw: Framework preset `None`, Build command puste, Build output directory `.`.
5. Jeśli chcesz uruchomić płatności, w ustawieniach projektu Pages → Settings → Variables and Secrets dodaj: `STRIPE_SECRET_KEY` (jako sekret), `STRIPE_PRICE_START`, `STRIPE_PRICE_STANDARD`, `STRIPE_PRICE_PREMIUM` (Stripe Price IDs).
6. Najpierw użyj klucza i Price IDs z trybu testowego Stripe. Przełącz na live dopiero po wykonaniu testowych zakupów.

## Ważne przed sprzedażą
- Bez konfiguracji Stripe przyciski zakupu pokażą komunikat, że płatności nie są jeszcze skonfigurowane — to normalne.
- Klucz Stripe pozostaje po stronie serwera; nie wpisuj go do HTML/JS ani do GitHuba.
- Ta wersja nie podłącza jeszcze D1/R2, nie zapisuje zamówień w D1 i nie wysyła automatycznie ebooków po zakupie. Do tego potrzebna jest osobna integracja webhooka Stripe z istniejącą bazą i bucketem.
- Ceny widoczne na stronie i ceny w Stripe muszą być zgodne.
- Zakres pakietów, dane sprzedawcy, regulamin, politykę prywatności, zasady odstąpienia od umowy i informacje o produktach cyfrowych trzeba uzupełnić/zweryfikować przed uruchomieniem sprzedaży.
- Opinie są oznaczone jako miejsca na prawdziwe recenzje — nie są opiniami klientów.

## Lokalny podgląd
Otwórz `index.html` w przeglądarce. Wygląd strony działa statycznie; endpoint płatności wymaga wdrożenia na Cloudflare Pages i konfiguracji Stripe.
