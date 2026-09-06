# Internationalization strategy

## Current public architecture

- `/` is the single universal English-language restaurant tip calculator.
- The English calculator supports user-selected display currencies without exchange-rate conversion.
- Existing supporting guides may remain U.S.-specific when their research and search intent are U.S.-specific.
- Do not create country calculator clones such as `/ca/`, `/uk/`, `/au/`, `/nz/`, or `/za/` unless future keyword/SERP evidence proves a genuinely distinct page is useful.

## Future non-English architecture

Potential localized versions may use language or locale subfolders such as `/de/`, `/fr/`, `/it/`, `/es/`, or `/pt/`.

A localized page must not be published until all of the following are true:

1. country/language-specific keyword and SERP demand is validated;
2. content is written or reviewed to native quality rather than literal machine translation;
3. local tipping customs and terminology are independently researched;
4. important factual claims use local authoritative sources;
5. the page is genuinely distinct and self-canonicalizes;
6. reciprocal hreflang is added only after the real alternate-language pages exist.

Do not create empty folders, placeholder routes, translated stubs, or hreflang references to URLs that do not exist.

## Routing and privacy principles

- Never force redirects by IP address.
- Do not use browser geolocation to choose a language or currency.
- Currency selection is explicit and local to the browser.
- Currency selection is a display/unit preference, not a country inference and not a signal for tip-percentage presets.
