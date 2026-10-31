// Cloudflare Pages Function: Stripe Checkout session creator.
// IMPORTANT: keep CHECKOUT_ENABLED unset/false until payment webhooks and fulfilment
// are implemented and tested. This protects customers from being charged before
// START materials or PRO/ELITE onboarding can be reliably delivered.

const PACKAGE_CONFIG = Object.freeze({
  start: { priceEnv: "STRIPE_PRICE_START", amount: 9900 },
  pro: { priceEnv: "STRIPE_PRICE_PRO", amount: 69900 },
  elite: { priceEnv: "STRIPE_PRICE_ELITE", amount: 149900 }
});

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export async function onRequestPost({ request, env }) {
  if (request.headers.get("content-type")?.toLowerCase().includes("application/json") !== true) {
    return json({ error: "Nieprawidłowy format żądania." }, 415);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Nie udało się odczytać żądania." }, 400);
  }

  const packageKey = String(body?.package || "").toLowerCase();
  if (!Object.hasOwn(PACKAGE_CONFIG, packageKey)) {
    return json({ error: "Wybrany pakiet nie istnieje." }, 400);
  }

  // Do not accept payments until fulfilment and webhook processing are ready.
  if (env.CHECKOUT_ENABLED !== "true") {
    return json({ error: "Zakup online nie jest jeszcze uruchomiony. Płatności zostaną udostępnione po zakończeniu konfiguracji realizacji zamówień." }, 503);
  }

  if (!env.STRIPE_SECRET_KEY) {
    return json({ error: "Brakuje konfiguracji płatności. Spróbuj ponownie później." }, 503);
  }

  const packageConfig = PACKAGE_CONFIG[packageKey];
  const priceId = env[packageConfig.priceEnv];
  if (!priceId || !/^price_[A-Za-z0-9]+$/.test(priceId)) {
    return json({ error: "Cena wybranego pakietu nie jest jeszcze skonfigurowana." }, 503);
  }

  try {
    // Verify the configured Stripe price matches the price shown on the website.
    const stripeHeaders = { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` };
    const priceResponse = await fetch(`https://api.stripe.com/v1/prices/${encodeURIComponent(priceId)}`, {
      method: "GET",
      headers: stripeHeaders
    });
    const price = await priceResponse.json().catch(() => ({}));
    if (!priceResponse.ok || price.active !== true || price.unit_amount !== packageConfig.amount || price.currency !== "pln" || price.recurring) {
      console.error("Stripe Price configuration mismatch", priceResponse.status, packageKey);
      return json({ error: "Konfiguracja ceny tego pakietu wymaga sprawdzenia. Płatność nie została rozpoczęta." }, 503);
    }

    const origin = new URL(request.url).origin;
    const form = new URLSearchParams({
      mode: "payment",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${origin}/?payment=success#jak-to-dziala`,
      cancel_url: `${origin}/?payment=cancelled#oferta`,
      "metadata[package_key]": `system-formy-${packageKey}`,
      "metadata[source]": "system-formy-public-site"
    });

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        ...stripeHeaders,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: form
    });

    const stripeResult = await stripeResponse.json().catch(() => ({}));
    if (!stripeResponse.ok) {
      // Keep internal Stripe details out of the public response.
      console.error("Stripe Checkout session creation failed", stripeResponse.status, stripeResult?.error?.type || "unknown");
      return json({ error: "Nie udało się teraz rozpocząć płatności. Spróbuj ponownie później." }, 502);
    }

    if (typeof stripeResult.url !== "string" || !stripeResult.url.startsWith("https://checkout.stripe.com/")) {
      return json({ error: "Stripe nie zwrócił prawidłowego adresu płatności." }, 502);
    }

    return json({ url: stripeResult.url });
  } catch (error) {
    console.error("Checkout endpoint error", error instanceof Error ? error.message : "unknown");
    return json({ error: "Nie udało się rozpocząć płatności. Spróbuj ponownie później." }, 500);
  }
}
