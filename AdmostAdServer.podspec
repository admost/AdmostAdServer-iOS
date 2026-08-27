Pod::Spec.new do |s|
  s.name             = 'AdmostAdServer'
  s.version          = '1.5.0'
  s.summary          = 'Admost ad server SDK for iOS.'
  s.description      = <<-DESC
    Requests creatives from the Admost ad server and renders banner, interstitial, rewarded
    and native placements, including third party HTML tags and VAST video, with IAB Open
    Measurement support.
  DESC

  s.homepage         = 'https://github.com/admost/AdmostAdServer-iOS'
  s.author           = { 'Admost' => 'support@admost.com' }
  s.license          = { :type => 'MIT', :file => 'LICENSE' }

  s.source           = {
    :git => 'https://github.com/admost/AdmostAdServer-iOS.git',
    :tag => s.version.to_s
  }

  s.platform              = :ios, '15.0'
  s.ios.deployment_target = '15.0'
  s.swift_versions        = ['5.0']

  # Prebuilt. The Open Measurement SDK is already linked into the framework, so it is not
  # a separate dependency.
  s.vendored_frameworks = 'AdmostAdServer.xcframework'

  # Copied to the app bundle root, which is where the SDK looks for it first.
  s.resources           = 'Resources/AdmostAdServerResources.bundle'
end
