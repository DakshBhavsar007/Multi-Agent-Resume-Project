/**
 * Centralized developer pricing plans configuration.
 * Single source of truth — used across DeveloperLandingPage, DeveloperRegisterPage,
 * DeveloperBilling, and AuthPage.
 */
export const DEVELOPER_PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    features: [
      "100 free parses/month",
      "Community support",
      "Basic formatting",
      "No SLA"
    ]
  },
  {
    id: "starter",
    name: "Starter",
    price: 2999,
    features: [
      "1000 parses/month",
      "Email support",
      "All output formats",
      "99% uptime"
    ]
  },
  {
    id: "business",
    name: "Business",
    price: 9999,
    features: [
      "10000 parses/month",
      "Priority support",
      "Custom prompts",
      "99.9% uptime SLA"
    ]
  }
];

/** Billing page may show extra features per plan */
export const DEVELOPER_PLANS_BILLING = DEVELOPER_PLANS.map(p => {
  if (p.id === "starter") return { ...p, features: [...p.features, "Webhooks"] };
  if (p.id === "business") return { ...p, features: [...p.features, "Embed UI Component"] };
  return p;
});
