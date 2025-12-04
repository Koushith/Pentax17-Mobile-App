//
//  LUTFrameProcessorPlugin.m
//  CamApp
//
//  Created for real-time LUT application
//

#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>
#import <VisionCamera/Frame.h>

#import "CamApp-Swift.h"

// Register the Swift Frame Processor Plugin
VISION_EXPORT_SWIFT_FRAME_PROCESSOR(LUTFrameProcessorPlugin, applyLUT)
