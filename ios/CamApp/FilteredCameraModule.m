//
//  FilteredCameraModule.m
//  CamApp
//
//  Module for taking photos with FilteredCamera
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(FilteredCameraModule, NSObject)

RCT_EXTERN_METHOD(takePhoto:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end
