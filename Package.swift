// swift-tools-version:5.9
//
//  Package.swift
//  AdmostAdServer
//
//  Binary distribution. The SDK ships as a prebuilt xcframework with the Open Measurement
//  SDK already linked into it, so there is no dependency to declare beyond this package.
//

import PackageDescription

let package = Package(
    name: "AdmostAdServer",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(
            name: "AdmostAdServer",
            targets: ["AdmostAdServer", "AdmostAdServerResources"]
        )
    ],
    targets: [
        .binaryTarget(
            name: "AdmostAdServer",
            path: "AdmostAdServer.xcframework"
        ),
        // Carries the resource bundle. SwiftPM can only attach resources to a regular
        // target, so this one exists purely to hold the bundle - see the note in
        // SwiftPMResourceTarget.swift.
        .target(
            name: "AdmostAdServerResources",
            path: "Resources",
            sources: ["SwiftPMResourceTarget.swift"],
            resources: [
                .copy("AdmostAdServerResources.bundle")
            ]
        )
    ]
)
