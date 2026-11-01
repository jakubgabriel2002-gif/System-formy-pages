# SYSTEM FORMY — aktualizacja sprzedaży i Stripe Checkout

Paczka bazuje na statycznej stronie Cloudflare Pages `system-formy-pages` (folder główny jest katalogiem publikacji). Zachowuje istniejący wygląd i dodaje sześć stron sprzedażowych, dynamiczny Stripe Checkout, webhook, weryfikację opłaconego zamówienia i stronę realizacji zakupu.

## Przepływ zakupu

1. Klient wybiera pakiet na stronie głównej lub wariant planu indywidualnego.
2. Trafia na dedykowaną stronę sprzedażową danego produktu.
3. Kliknięcie zakupu wywołuje `/api/create-checkout`.
4. Cloudflare Pages Function tworzy sesję Stripe Checkout przez API. Cena, nazwa i opis są definiowane po stronie serwera w `functions/_shared/catalog.js`. Nie trzeba ręcznie tworzyć sześciu produktów ani cen w panelu Stripe.
5. Stripe po płatności przekierowuje klienta do `/realizacja.html?session_id=...`.
6. Strona realizacji pyta `/api/checkout-status`, który pobiera sesję bezpośrednio ze Stripe i sprawdza `payment_status=paid`. Sam powrót przeglądarki nie odblokowuje materiałów.
7. Webhook pod `/api/stripe/webhook` weryfikuje podpis `Stripe-Signature`, zapisuje zdarzenie i status zamówienia w D1.
8. SYSTEM START: klient wybiera dom albo siłownię i pobiera zakupiony pakiet przez prywatny bucket R2. PRO, ELITE i plany indywidualne: klient wypełnia ankietę powiązaną z opłaconą sesją Stripe.

## Ważne — przed wdrożeniem

Same sekrety Stripe nie wystarczą. Funkcje wymagają bindingów D1 i R2 oraz wykonania migracji SQL. Dopóki bindingi i prywatne pliki START nie będą gotowe, endpoint bezpiecznie blokuje odpowiedni zakup zamiast pobierać pieniądze bez możliwości realizacji.

### A. Sprawdź Secrets w Cloudflare Pages

W projekcie **Cloudflare Pages `system-formy-pages`** (nie w osobnym Workerze aplikacji) → Settings → Variables and Secrets ustaw jako zaszyfrowane Secrets dla Production. Pages Functions odczytują sekrety przypięte do tego konkretnego projektu. Jeżeli wcześniej dodałeś je tylko do innego Workera, dodaj je również tutaj:

- `STRIPE_SECRET_KEY` — klucz `sk_test_...` do testów, a przed uruchomieniem sprzedaży `sk_live_...`.
- `STRIPE_WEBHOOK_SECRET` — Signing secret `whsec_...` endpointu Stripe wskazanego niżej.

Kod nie używa `pk_live_...` — Checkout jest tworzony serwerowo.

### B. D1 — baza zamówień

W projekcie **Pages `system-formy-pages`** → Settings → Bindings dodaj D1 database binding:

- Variable name: `DB`
- D1 database: istniejąca baza projektu, np. `system-formy-db` (wybierz właściwą bazę z listy; nie twórz drugiej, jeśli ta jest już używana przez stronę).

Wykonaj plik `migrations/0001_stripe_orders.sql` na tej samej bazie D1 (Cloudflare Dashboard → D1 → baza → Console / SQL, wklej cały plik i wykonaj). Migracja tworzy tabele `sf_orders` i `sf_stripe_events`; nie usuwa istniejących tabel.

### C. R2 — prywatne pliki SYSTEM START

W projekcie **Pages `system-formy-pages`** → Settings → Bindings dodaj R2 bucket binding:

- Variable name: `PRODUCT_FILES`
- Bucket: istniejący prywatny bucket materiałów, np. `system-formy-products`.

Pobierz osobną paczkę `SYSTEM-FORMY-MATERIALY-DO-R2.zip`, rozpakuj ją lokalnie i wgraj oba pliki do R2 jako poniższe obiekty (foldery w R2 są częścią klucza obiektu):

- `system-start/home.zip` — zawartość paczki `system-start-home.zip` z osobnej paczki `SYSTEM-FORMY-MATERIALY-DO-R2.zip`.
- `system-start/gym.zip` — zawartość paczki `system-start-gym.zip` z osobnej paczki `SYSTEM-FORMY-MATERIALY-DO-R2.zip`.

Bucket musi pozostać prywatny. Nie podłączaj publicznej domeny do tych plików. Funkcja `download-start` przekazuje plik dopiero po sprawdzeniu opłaconej sesji Stripe. Po dodaniu bindingów wykonaj nowy deployment Pages, aby Functions otrzymały nowe zasoby.

### D. Stripe webhook

Po wdrożeniu strony ustaw w Stripe → Developers → Webhooks endpoint:

`https://system-formy-pages.pages.dev/api/stripe/webhook`

Jeżeli używasz własnej domeny, użyj tej domeny zamiast `system-formy-pages.pages.dev`.

Zaznacz zdarzenia:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

Otwórz endpoint → Reveal signing secret. Wartość `whsec_...` musi należeć dokładnie do tego endpointu i być zapisana w Cloudflare jako `STRIPE_WEBHOOK_SECRET`. Jeśli masz już utworzony endpoint pod tym adresem i ten secret jest z nim powiązany, nie twórz duplikatu.

### E. Wdrożenie

1. Zrób kopię aktualnego repozytorium.
2. Rozpakuj paczkę i skopiuj całą zawartość katalogu projektu do głównego katalogu repozytorium `system-formy-pages`, zachowując ścieżki.
3. Commit + push na gałąź podłączoną do Cloudflare Pages.
4. Poczekaj na zakończenie deploymentu. Bindingi D1 i R2 muszą być podpięte również dla Production.

## Produkty i ceny (konfigurowane po stronie serwera)

| Klucz | Produkt | Cena |
|---|---|---:|
| `start` | SYSTEM START | 99,00 zł |
| `pro` | SYSTEM PRO | 699,00 zł |
| `elite` | SYSTEM ELITE | 1499,00 zł |
| `individual-basic` | Plan indywidualny — sam plan | 99,99 zł |
| `individual-monitor` | Plan indywidualny + monitoring i wsparcie | 149,99 zł |
| `individual-full` | Plan indywidualny + monitoring + kontrola ćwiczeń | 199,99 zł |

Kwoty są stałe po stronie Function. Frontend nie może przesłać własnej ceny. Aktualizacja ceny wymaga zmiany `functions/_shared/catalog.js` i wdrożenia nowego deploymentu.

## Ważne o retencji danych

D1 zapisuje datę graniczną `retention_due_at` oraz odpowiedzi ankiety. Ta paczka nie wdraża jeszcze automatycznego zadania cyklicznego usuwającego dane po upływie retencji. Przed uruchomieniem sprzedaży trzeba dodać i przetestować harmonogram czyszczenia D1 zgodny z zasadą przechowywania danych przez okres współpracy i 6 miesięcy po niej (z uwzględnieniem danych, które muszą być przechowywane dłużej na podstawie prawa).

## Test przed uruchomieniem Live

1. Użyj klucza `sk_test_...` i endpointu webhook w trybie testowym (sekret testowego endpointu).
2. Zrób testowe zamówienie każdego z sześciu produktów.
3. Sprawdź, czy webhook otrzymał `checkout.session.completed` i czy w D1 `sf_orders.payment_status` ma wartość `paid`.
4. SYSTEM START: sprawdź, czy sesja bez opłacenia nie pobiera pliku, a opłacona pozwala pobrać odpowiednią wersję z R2.
5. Pozostałe produkty: sprawdź, czy formularz realizacji nie pojawia się bez płatności i zapisuje ankietę po płatności.
6. Dopiero po poprawnym przejściu testów podmień `STRIPE_SECRET_KEY` i `STRIPE_WEBHOOK_SECRET` na parę Live i skonfiguruj Live endpoint.

## Pliki aktualizacji

- `index.html`, `plan-indywidualny.html` — przekierowania do stron sprzedażowych.
- `produkt-*.html` — sześć stron sprzedażowych.
- `realizacja.html` — strona po płatności.
- `functions/api/*` — Checkout, weryfikacja, webhook, ankieta i pobieranie.
- `functions/_shared/*` — katalog produktów i wspólne funkcje Stripe.
- `migrations/0001_stripe_orders.sql` — tabele D1.
- `SYSTEM-FORMY-MATERIALY-DO-R2.zip` (osobny plik poza publiczną paczką strony) — prywatne materiały do wgrania do R2.

Nie wgrywaj sekretów do repozytorium ani nie wysyłaj ich w wiadomościach.
