export const SITE_NAME = 'Restaurant Tip Calculator';
export const SITE_ORIGIN = 'https://restauranttipcalculator.com';
export const DEFAULT_SOCIAL_IMAGE_PATH = '/social/restaurant-tip-calculator-og.png';

export const INDEXABLE_ROUTES = Object.freeze([
  '/',
  '/average-restaurant-tip/',
  '/how-much-tip-waitress-waiter/',
  '/buffet-tipping-guide/',
  '/food-delivery-tip-calculator/',
  '/service-charge-on-restaurant-bill/',
  '/methodology/',
  '/about/',
  '/privacy/',
]);

export const ADS_ENABLED = import.meta.env?.PUBLIC_ADS_ENABLED === 'true';
