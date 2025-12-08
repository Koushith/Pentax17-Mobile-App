//
//  FilteredCameraViewManager.m
//  CamApp
//
//  Native camera view with real-time LUT filtering
//

#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(FilteredCameraViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(filterId, NSString)
RCT_EXPORT_VIEW_PROPERTY(position, NSString)
RCT_EXPORT_VIEW_PROPERTY(isActive, BOOL)

@end
