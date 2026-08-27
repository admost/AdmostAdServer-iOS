# AdmostAdServer iOS SDK

Ad serving SDK for iOS. Requests creatives from the Admost ad server and renders banner,
interstitial, rewarded and native placements, including third party HTML tags and VAST video,
with IAB Open Measurement (OMID) support.

- **Version:** 1.5.0
- **Language:** Swift 5, full Objective-C interoperability (`@objc`)

---

## Requirements

| | |
|---|---|
| iOS | 15.0+ |
| Xcode | 26.6+ |
| Swift | 5.0+ |
| Slices | `ios-arm64` (device), `ios-arm64_x86_64-simulator` |

---

## Installation

The SDK is distributed as a prebuilt XCFramework. The IAB Open Measurement SDK is already
linked into it, so there is nothing else to add.

### Swift Package Manager

```swift
dependencies: [
    .package(url: "https://github.com/admost/AdmostAdServer-iOS.git", from: "1.5.0")
]
```

Or in Xcode: *File → Add Package Dependencies…* and paste the repository URL.

### CocoaPods

```ruby
pod 'AdmostAdServer', '~> 1.5'
```

### Manual

Add both artefacts to your target — **both are required**, the SDK fails to initialise with
`sdkResourcesNotFound` (10008) without the resource bundle.

| Artefact | How to add it |
|---|---|
| `AdmostAdServer.xcframework` | *Frameworks, Libraries, and Embedded Content* → Embed & Sign |
| `Resources/AdmostAdServerResources.bundle` | *Build Phases → Copy Bundle Resources* |

The bundle is located at runtime by searching the app bundle, so it works whether it sits at
the app root or nested inside another bundle.

## Info.plist

The ad request goes over HTTPS. Two things still need an exception:

- `admost.com`, for impression tracking
- third party creatives, whose assets are served from arbitrary hosts

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
    <key>NSExceptionDomains</key>
    <dict>
        <key>admost.com</key>
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key><true/>
            <key>NSIncludesSubdomains</key><true/>
        </dict>
    </dict>
</dict>
```

Narrow this to what your own campaigns actually need. If all your creatives are HTTPS, the
`admost.com` exception alone is enough.

If you pass an IDFA, you also need `NSUserTrackingUsageDescription` and must request ATT
permission yourself — the SDK does not touch `AdSupport` or `AppTrackingTransparency`.

---

## Initialization

Call once, before requesting any ad. `start` must be called on the main thread.

```swift
import AdmostAdServer

AdmostAdServerSDK.setLogLevel(.debug)          // .none | .error | .info | .debug
AdmostAdServerSDK.setAdmostAppId("<app-id>")
AdmostAdServerSDK.setAdmostUserId("<user-id>") // optional
AdmostAdServerSDK.setEncryptedIDFA("<idfa>")   // optional, encrypted by the caller

AdmostAdServerSDK.start { error in
    // error is nil on success
}
```

```objc
[AdmostAdServerSDK setLogLevel:LogLevelDebug];
[AdmostAdServerSDK setAdmostAppId:@"<app-id>"];
[AdmostAdServerSDK startWithCompletion:^(NSError * _Nullable error) { }];
```

`AdmostAdServerSDK.isInitialized` reports the current state. Loading an ad before
initialisation fails with `sdkNotInitialized` (10001).

### Custom targeting

Every ad type accepts `customData`, whose keys are appended to the ad request as query
parameters. Set it before `load()`.

```swift
interstitial.customData = ["segment": "returning", "level": 12]
```

---

## Ad formats

### Banner

```swift
let banner = AASBannerView(zoneId: "<zone-id>", size: .banner)
banner.delegate = self
view.addSubview(banner)
banner.load()
```

| `AASBannerSize` | Dimensions |
|---|---|
| `.banner` | 320×50 |
| `.mpu` | 300×250 |
| `.leaderboard` | 728×90 (tablet) |

`AASBannerView` is a `UIView`; position it with frames or Auto Layout. A creative that
declares its own size resizes the view to match, capped at 25% of screen height, and reports
the new size through `bannerDidResize`. Read `intrinsicContentSize` if you lay out with
constraints.

The SDK does **not** refresh banners. Call `load()` again on your own schedule.

```swift
@objc optional func bannerDidReceive(_ banner: AASBannerView)
@objc optional func bannerDidFailToReceive(_ banner: AASBannerView, error: NSError)
@objc optional func bannerDidPresent(_ banner: AASBannerView)   // viewable, see below
@objc optional func bannerDidClick(_ banner: AASBannerView)
@objc optional func bannerDidDismiss(_ banner: AASBannerView)
@objc optional func bannerDidResize(_ banner: AASBannerView, size: CGSize)
```

### Interstitial

```swift
let interstitial = AASInterstitial(zoneId: "<zone-id>")
interstitial.delegate = self
interstitial.load()

// later, once status == .loaded
interstitial.show(self)
```

```swift
@objc optional func interstitialDidReceive(_ interstitial: AASInterstitial)
@objc optional func interstitialDidFailToReceive(_ interstitial: AASInterstitial, error: NSError)
@objc optional func interstitialDidFailToPresent(_ interstitial: AASInterstitial, error: NSError)
@objc optional func interstitialDidPresent(_ interstitial: AASInterstitial)
@objc optional func interstitialDidDismiss(_ interstitial: AASInterstitial)
@objc optional func interstitialDidClick(_ interstitial: AASInterstitial)
```

### Rewarded

Same shape as interstitial, plus a completion callback. Grant the reward on
`rewardedDidComplete`, which fires when the video finishes — not on dismissal.

```swift
@objc optional func rewardedDidComplete(_ rewarded: AASRewarded)
```

Skip behaviour comes from the ad server (`skippableAt`) or, for a VAST creative, from the
tag's own `skipoffset`.

### Native

The SDK supplies the assets; you build the layout.

```swift
let native = AASNativeAd(zoneId: "<zone-id>")
native.delegate = self
native.load()

func nativeAdDidReceive(_ nativeAd: AASNativeAd) {
    titleLabel.text = nativeAd.title
    bodyLabel.text  = nativeAd.desc
    ctaButton.setTitle(nativeAd.ctaText, for: .normal)
    iconView.image  = nativeAd.icon
    privacyButton.setImage(nativeAd.privacyIcon, for: .normal)

    if let mediaView = nativeAd.mediaView {
        container.addSubview(mediaView)
    }

    nativeAd.register(privacyView: privacyButton)
    nativeAd.register(clickableViews: [ctaButton, titleLabel, container])
}
```

| Property | Type |
|---|---|
| `title`, `desc`, `ctaText` | `String?` |
| `icon`, `privacyIcon` | `UIImage?` |
| `iconURL`, `ctaURL` | `URL?` |
| `mediaView` | `UIView?` — image, video or HTML creative |

`register(clickableViews:)` attaches a target/action to any `UIControl` and a tap recogniser
to everything else, so `UILabel`, `UIImageView`, container views and your own subclasses all
work. Registering the privacy view is required for AdChoices compliance.

---

## Impressions and viewability

Impressions follow the **MRC viewable impression** standard. An impression fires — and
`bannerDidPresent` / `nativeAdDidShow` are called — only once the creative has met its
threshold. Being attached to a window is not enough.

| Creative | Threshold |
|---|---|
| Display | ≥ 50% of pixels for **1 continuous second** |
| Large display (≥ 242,500 px) | ≥ 30% for 1 continuous second |
| Video | ≥ 50% of pixels for **2 continuous seconds** |

Visibility accounts for:

- the view being attached to a visible window
- `isHidden` and `alpha` on the view **and every ancestor** (catches unselected tabs and
  collapsed containers)
- clipping by any ancestor with `clipsToBounds` (a banner scrolled half out of a list reads
  as 50% visible)
- intersection with the window's bounds
- the app being foreground

Exposure must be **continuous**: any sample below the threshold resets the clock, so two
0.6-second exposures do not add up to an impression.

**Limitations.** Visibility is sampled every 200 ms, which is the resolution of the
measurement — interruptions shorter than that pass unseen, and exposure is credited in whole
intervals. Occlusion by an opaque view drawn on top is not detected. Both match how the OM
SDK measures, so numbers stay close to what verification vendors report.

**Fullscreen ads are exempt.** Interstitials and rewarded ads are presented modally and cover
the window by construction, so their impression fires on presentation.

---

## Clicks

All click-throughs are restricted to `http`, `https`, `itms-apps` and `itms-appss`. A
creative pointing at any other URL scheme is refused and logged — this prevents an ad from
deep-linking into arbitrary apps on the device. Clicks open in the system browser; there is
no in-app `SKStoreProductViewController`.

---

## Threading

- `AdmostAdServerSDK.start` must be called on the main thread.
- **Every delegate callback is delivered on the main thread**, including failures. You can
  touch UI directly in any of them.
- `load()` and `show(_:)` should be called from the main thread.

### Ad lifecycle

`status` is `AdStatus`: `.new` (0), `.loading` (1), `.loaded` (2).

```
.new ──load()──> .loading ──┬── success ──> .loaded ──show()──> dismissed ──> .new
                            └── failure ──> .new
```

`load()` is a no-op while `.loading`. After a failure the status returns to `.new`, so
retrying is safe. Fullscreen ads are single use: after dismissal, `load()` again.

---

## Third party creatives

### HTML tags

Tag creatives (DCM / Campaign Manager and similar) are wrapped in a document that measures
itself, scales to fit the slot and reports its size back. Tags that never declare a size are
treated as fluid and given the slot's dimensions. `window.open` is intercepted and treated as
a click rather than a navigation.

**MRAID is not implemented.** A creative that calls `mraid.*` will not render correctly.

### VAST

VAST tags are resolved during `load()`, before the ad reaches the UI, and converted into a
plain video ad. Supported:

- VAST 2.0 / 3.0 / 4.x, InLine and Wrapper
- Wrapper chains up to 5 deep, 8 s per request; every wrapper's impressions and tracking
  events are merged and fired
- Linear creatives, progressive `MediaFile` selection by screen width and bitrate
- `skipoffset` (absolute and percentage)
- `ClickThrough` / `ClickTracking`
- `Companion` static image as the end card
- AdChoices `Icon` → privacy button
- `AdVerification` → OMID video session
- IAB error codes fired to `<Error>` URLs

Not supported: VPAID (rejected with error 403), `NonLinear` rendering (parsed, reported as
201), ad pods / `sequence`, VMAP, `InteractiveCreativeFile` / SIMID, HLS and DASH manifests
(the media is downloaded before playback).

### Open Measurement

OMID sessions are started automatically for display, HTML tag and VAST video creatives.
Partner name `kokteyl1`, version reported as the SDK version. The SDK registers its own
controls — close, skip, sound, CTA — as friendly obstructions. There is no public API for
registering your own, so avoid drawing over an ad you did not place.

---

## Caching

Video and image creatives are downloaded to `Caches/AdmostAdServer/` before playback, keyed
by a SHA-256 of the full URL. Files older than 24 hours are swept at startup, and the
directory is capped at 256 MB (oldest first). A single creative over 64 MB is rejected. The
SDK never touches files outside its own directory.

---

## Error codes

`NSError` domain `AdmostAdServer`:

| Code | Meaning |
|---|---|
| 10001 | SDK not initialised |
| 10002 | No internet connection |
| 10003 | Ad already used |
| 10004 | No data / server error |
| 10005 | Media missing or broken |
| 10006 | Ad not ready (`show` before `.loaded`) |
| 10007 | Response type does not match the requested type |
| 10008 | SDK resource bundle not found |
| 10009 | Ad parse error |
| 10010 | Request could not be built |

VAST errors use domain `AdmostAdServer.VAST` with standard IAB codes (100, 102, 200, 201,
300–303, 400–405, 900).

---

## Privacy

The framework ships a `PrivacyInfo.xcprivacy` declaring device ID, user ID, advertising data
and device information collected for third party advertising, plus API reasons for
`UserDefaults` (`CA92.1`) and file timestamps (`C617.1`).

`NSPrivacyTrackingDomains` is intentionally empty. Listing a domain there makes iOS block all
requests to it when App Tracking Transparency permission has not been granted, which stops ad
delivery. Whether `admost.com` belongs there depends on how the ad server treats requests
without consent.

**No consent APIs.** The SDK does not read IAB TCF or GPP strings and does not forward GDPR,
CCPA or COPPA signals to the ad server.

---

## Debugging

`setLogLevel(.debug)` logs ad requests, responses, tag measurements and VAST resolution. It
also enables Safari Web Inspector on creative web views (iOS 16.4+).

The SDK also exposes a way to bypass the ad server and render a response you supply. It is
compiled into debug builds only and is absent from the released framework, so it is
available when you build the SDK from source.

---

## Not supported

App Open ads · MRAID · adaptive banner sizes · banner auto-refresh · VAST ad pods ·
NonLinear / overlay creatives · playables (SIMID) · SKAdNetwork · in-app App Store sheet ·
GDPR / CCPA / COPPA consent signalling
