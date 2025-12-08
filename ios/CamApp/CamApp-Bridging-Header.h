//
//  CamApp-Bridging-Header.h
//  CamApp
//
//  Bridging header for Swift to access VisionCamera and React Native Objective-C headers
//

#ifndef CamApp_Bridging_Header_h
#define CamApp_Bridging_Header_h

// React Native headers for native module support
#import <React/RCTViewManager.h>
#import <React/RCTBridgeModule.h>

// VisionCamera headers for frame processor plugins
#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>
#import <VisionCamera/Frame.h>
#import <VisionCamera/VisionCameraProxyHolder.h>

#endif /* CamApp_Bridging_Header_h */
