// Stałe linki płatności Stripe (Payment Links). Po płatności Stripe przekierowuje do ankiety:
// pro → /ankieta-pro, elite → /ankieta-elite, individual-basic → /ankieta-plan-basic,
// individual-monitor → /ankieta-plan-monitoring, individual-full → /ankieta-plan-full.
// PRO i ELITE nie mają przycisku na stronie — link wysyłasz e-mailem (panel: „Kopiuj link płatności”).
window.SF_PAYMENT_LINKS = Object.freeze({
  pro: 'https://buy.stripe.com/cNi00l9aj4Tv0jq2Wv3AY0a',
  elite: 'https://buy.stripe.com/3cI28t0DN2LnfekeFd3AY09',
  'individual-basic': 'https://buy.stripe.com/7sY14p3PZ85HfekdB93AY0b',
  'individual-monitor': 'https://buy.stripe.com/cNi4gB72b5Xz5DK8gP3AY0c',
  'individual-full': 'https://buy.stripe.com/bJe3cxgCL85H6HO68H3AY0d'
});
