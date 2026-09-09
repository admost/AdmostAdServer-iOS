# Changelog

All notable changes to the AdmostAdServer iOS SDK are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.6.0] — 2026-09-08

### Added

- **Interscroller.** A new `AASInterscrollerView` renders a full bleed creative that stays
  fixed on screen behind its slot in a scrolling feed, revealing a different slice as the
  feed scrolls. It serves any creative type, including MRAID, and owns its impression on the
  MRC rule measured against the slot. The ad server serves it as the `interscroller` type.
- **MRAID.** Creatives that use MRAID now render, to the level of MRAID 3.0 a banner or
  interstitial needs: the state machine and the `ready`, `stateChange`, `viewableChange`,
  `exposureChange`, `sizeChange` and `error` events; `open`, `close`, `expand` (one and two
  part) and orientation properties; and the position, size and viewability queries. The SDK
  injects its own `mraid.js` and removes the creative's own script tag for it. `resize`, and
  the `sms` / `tel` / `storePicture` / `createCalendarEvent` features, are reported as
  unsupported through `mraid.supports()` rather than silently ignored. A creative that does
  not mention MRAID is rendered as a plain tag, unchanged. See *Macros* and *Third party
  creatives* in the README.
- **Macro expansion in third party URLs.** The cache-buster (`[timestamp]`, `[CACHEBUSTING]`,
  `[RANDOM]`, `%%CACHEBUSTER%%`) and the IAB TCF consent macros (`${GDPR}`,
  `${GDPR_CONSENT_xxx}`) are now filled in the ad server's `thirdPartyImpURL`, `ctaURL` and
  `privacyURL`, inside HTML tag creatives and in VAST tracking URLs. Previously they reached
  the tracker percent-encoded (`ord=%5Btimestamp%5D`, `gdpr=$%7BGDPR%7D`), so DCM impressions
  went out without a cache-buster and with a broken consent parameter. See *Macros* in the
  README for the full list.
- **GDPR consent.** The SDK reads `IABTCF_gdprApplies` and `IABTCF_TCString` from the standard
  user defaults, so apps with a TCF v2 CMP need no change. Apps without one can call
  `AdmostAdServerSDK.setGDPRConsent(applies:consentString:)`. Consent is used only to fill the
  macros above; it is still not sent to the ad server.

### Changed

- Every impression request now carries its own cache-buster. The URLs are built from the raw
  server strings at the moment they are used rather than once at decode time.
- A server URL that is already valid is no longer percent-encoded a second time; encoding is
  applied only when the string cannot form a URL as it is (spaces, non-ASCII characters).
- VAST cache-busters are milliseconds since the epoch instead of an 8 digit random number.

## [1.5.0] — 2026-08-27

First release distributed as a standalone SDK. Earlier versions shipped inside the Admost
mediation SDK.

### Breaking

- **Minimum deployment target is now iOS 15.0** (was 13.0).
- **Click-throughs are limited to `http`, `https`, `itms-apps` and `itms-appss`.** A creative
  pointing at any other URL scheme is refused and logged. Campaigns that deep-link into
  another app with a custom scheme will no longer open.

### Added

- **Swift Package Manager and CocoaPods support.** The SDK is distributed as a prebuilt
  XCFramework with the IAB Open Measurement SDK already linked in, so there is no longer a
  separate OMSDK artefact to add.
- **Privacy manifest.** The framework ships `PrivacyInfo.xcprivacy` declaring the data it
  collects and the reasons for the APIs it uses, so you no longer need to declare them on the
  SDK's behalf. `NSPrivacyTrackingDomains` is left empty — see the README before submitting.
- Integration documentation covering every ad format, the delegate contracts and the error
  codes.

### Changed

- **Impressions now follow the MRC viewable impression standard.** An impression fires, and
  `bannerDidPresent` / `nativeAdDidShow` are called, only once the creative has been on
  screen: 50% of its pixels for 1 continuous second for display, 30% for a large ad, and 50%
  for 2 continuous seconds for video. Previously an impression counted as soon as the view
  was attached to a window, which included ads in an unselected tab, below the fold or in a
  backgrounded app. **Expect your reported impression counts to drop and to align more
  closely with third party verification.** Fullscreen ads are unaffected.
- **Every delegate callback is now delivered on the main thread**, failures included. You can
  update UI directly in any of them; previously the failure callbacks arrived on a background
  thread.
- **The ad request is served over HTTPS.** If your `NSAppTransportSecurity` exception existed
  only for the ad request, you can narrow it. Impression tracking still uses http.
- The connection type reported to the ad server now distinguishes Wi-Fi and 5G.

### Fixed

- **An ad object no longer stops working after a failed load.** A network failure left the ad
  in a loading state and every later `load()` was silently ignored, so the object never
  recovered. Retrying now works.
- **`register(clickableViews:)` no longer ignores views.** `UILabel`, `UIStackView`,
  container views and your own `UIButton` subclasses were silently dropped, leaving a native
  ad with no clickable area and no error.
- **Media banners no longer report `bannerDidPresent` twice.**
- **The SDK's media cache no longer deletes files it does not own.** Its cleanup pass ran
  over the app's `Caches` directory and removed any `.mp4`, `.m4v` or `.mov` older than a
  day, including files belonging to the host app or other SDKs. Everything now lives in a
  dedicated subdirectory, capped at 256 MB.
- **The per-install identifier is stable across launches.** It was regenerated on every ad
  request, so frequency capping and user-level targeting never took effect.
- Fixed several crashes: an unavailable network reachability monitor, a malformed URL in an
  ad response, and two ad view lifecycle races.
- Video creatives are streamed to disk instead of being held in memory while downloading.

---

## [1.4.0] — 2026-08-13

### Added

- **VAST support.** Third party VAST tags are resolved during `load()` and played as ordinary
  video ads, so no API changes are needed to serve them.
  - VAST 2.0 / 3.0 / 4.x, InLine and Wrapper
  - Wrapper chains up to 5 deep; impressions and tracking events from every wrapper in the
    chain are fired
  - `skipoffset`, absolute and percentage
  - `ClickThrough` and `ClickTracking`
  - `Companion` static image reused as the end card
  - AdChoices `Icon` mapped to the privacy button
  - `AdVerification` driving an OMID native video session
  - IAB error codes reported back to the creative's `<Error>` URLs
  - For rewarded placements the reward is granted on completion, not at the skip offset

  Not supported: VPAID, ad pods, VMAP, NonLinear creatives, SIMID, and HLS or DASH
  renditions. VAST is accepted for interstitial and rewarded placements only.
