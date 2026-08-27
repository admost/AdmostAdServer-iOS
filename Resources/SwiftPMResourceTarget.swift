//
//  SwiftPMResourceTarget.swift
//  AdmostAdServer
//
//  Not part of the SDK.
//
//  SwiftPM will only attach resources to a regular target, and a binary target cannot carry
//  any. This file gives the package a regular target to hang `AdmostAdServerResources.bundle`
//  off, so that Swift Package Manager consumers get the bundle copied into their app the way
//  CocoaPods and manual integrations do.
//
//  The SDK finds the bundle at runtime by searching the app bundle, so nothing here is ever
//  called.
//

enum AdmostAdServerResources {}
