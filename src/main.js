(() => {
  "use strict";

  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".main-nav");

  function closeMenu() {
    if (!menuButton || !navigation) return;
    navigation.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Otwórz menu");
    document.body.classList.remove("menu-open");
  }

  menuButton?.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Otwórz menu" : "Zamknij menu");
    navigation?.classList.toggle("open", !isOpen);
    document.body.classList.toggle("menu-open", !isOpen);
  });

  navigation?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  const toast = document.querySelector("#site-toast");
  let toastTimeout;
  function notify(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => toast.classList.remove("show"), 5200);
  }

  // Checkout is deliberately disabled until Stripe payment confirmation and
  // package fulfilment (START delivery / PRO-ELITE onboarding) are connected.
  document.querySelectorAll(".buy-button[data-package]").forEach((button) => {
    button.addEventListener("click", async () => {
      const packageKey = button.dataset.package;
      if (!packageKey) return;

      const originalLabel = button.innerHTML;
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      button.textContent = "SPRAWDZAM...";

      try {
        const response = await fetch("/api/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ package: packageKey })
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || "Zakup online nie jest jeszcze dostępny.");
        }
        if (typeof data.url !== "string") {
          throw new Error("Nie otrzymano bezpiecznego adresu płatności.");
        }

        const checkoutUrl = new URL(data.url);
        if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "checkout.stripe.com") {
          throw new Error("Otrzymano nieprawidłowy adres płatności.");
        }
        window.location.assign(checkoutUrl.href);
      } catch (error) {
        notify(error instanceof Error ? error.message : "Nie udało się rozpocząć zakupu.");
      } finally {
        button.disabled = false;
        button.removeAttribute("aria-busy");
        button.innerHTML = originalLabel;
      }
    });
  });

  const currentYear = document.querySelector("#current-year");
  if (currentYear) currentYear.textContent = String(new Date().getFullYear());

  const paymentStatus = new URLSearchParams(window.location.search).get("payment");
  if (paymentStatus === "success") {
    notify("Płatność została zakończona. Informacje o realizacji zamówienia zostaną przekazane zgodnie z wybranym pakietem.");
  } else if (paymentStatus === "cancelled") {
    notify("Płatność została anulowana. Możesz wrócić do wyboru pakietu.");
  }
  if (paymentStatus) {
    window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
  }
})();
