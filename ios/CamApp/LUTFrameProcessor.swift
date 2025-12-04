import Foundation
import CoreImage
import CoreMedia
import UIKit

@objc(LUTFrameProcessorPlugin)
public class LUTFrameProcessorPlugin: FrameProcessorPlugin {

    private static var ciContext: CIContext = {
        // Use Metal for GPU acceleration
        if let metalDevice = MTLCreateSystemDefaultDevice() {
            return CIContext(mtlDevice: metalDevice, options: [
                .cacheIntermediates: false,
                .priorityRequestLow: false
            ])
        }
        return CIContext(options: [.useSoftwareRenderer: false])
    }()

    private static var lutFilters: [String: CIFilter] = [:]
    private static let lutQueue = DispatchQueue(label: "com.camapp.lut", qos: .userInteractive)

    public override init(proxy: VisionCameraProxyHolder, options: [AnyHashable : Any]? = nil) {
        super.init(proxy: proxy, options: options)
        // Preload LUTs
        LUTFrameProcessorPlugin.preloadLUTs()
    }

    // Map filter IDs to LUT file names
    private static let filterToLUT: [String: String] = [
        "kodak_250d": "kodak-250D",
        "moonrise_kingdom": "moonrise-kingdom",
        "vintage_overlay": "vintage-overlay",
        "clean_raw": "clean-raw"
    ]

    private static func preloadLUTs() {
        lutQueue.async {
            for (filterId, lutName) in filterToLUT {
                if lutFilters[filterId] == nil {
                    if let filter = createLUTFilter(named: lutName) {
                        lutFilters[filterId] = filter
                        print("[LUT] Preloaded filter: \(filterId)")
                    }
                }
            }
        }
    }

    private static func createLUTFilter(named name: String) -> CIFilter? {
        guard let lutURL = Bundle.main.url(forResource: name, withExtension: "cube"),
              let lutData = try? String(contentsOf: lutURL, encoding: .utf8) else {
            return nil
        }

        // Parse .cube LUT file
        var size = 0
        var lutValues: [Float] = []

        let lines = lutData.components(separatedBy: .newlines)
        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            if trimmed.isEmpty || trimmed.hasPrefix("#") || trimmed.hasPrefix("TITLE") || trimmed.hasPrefix("DOMAIN") {
                continue
            }
            if trimmed.hasPrefix("LUT_3D_SIZE") {
                let parts = trimmed.split(separator: " ")
                if parts.count >= 2, let s = Int(parts[1]) {
                    size = s
                }
                continue
            }

            let components = trimmed.split(separator: " ").compactMap { Float($0) }
            if components.count == 3 {
                lutValues.append(contentsOf: components)
                lutValues.append(1.0) // Alpha
            }
        }

        guard size > 0 && lutValues.count == size * size * size * 4 else {
            return nil
        }

        // Create CIColorCubeWithColorSpace filter
        let cubeData = Data(bytes: lutValues, count: lutValues.count * MemoryLayout<Float>.size)

        guard let filter = CIFilter(name: "CIColorCubeWithColorSpace") else {
            return nil
        }

        filter.setValue(size, forKey: "inputCubeDimension")
        filter.setValue(cubeData, forKey: "inputCubeData")
        filter.setValue(CGColorSpaceCreateDeviceRGB(), forKey: "inputColorSpace")

        return filter
    }

    private static var frameCount = 0

    public override func callback(_ frame: Frame, withArguments arguments: [AnyHashable : Any]?) -> Any? {
        LUTFrameProcessorPlugin.frameCount += 1
        if LUTFrameProcessorPlugin.frameCount % 30 == 0 {
            print("[LUT] Frame processor called, frame #\(LUTFrameProcessorPlugin.frameCount), args: \(String(describing: arguments))")
        }

        guard let filterId = arguments?["filterId"] as? String else {
            print("[LUT] No filterId provided")
            return nil
        }

        // Skip processing for "clean_raw" (no filter needed)
        if filterId == "clean_raw" {
            return nil
        }

        // Get or create LUT filter
        var lutFilter = LUTFrameProcessorPlugin.lutFilters[filterId]

        if lutFilter == nil {
            // Filter not loaded yet, try to load it
            if let lutName = LUTFrameProcessorPlugin.filterToLUT[filterId],
               let filter = LUTFrameProcessorPlugin.createLUTFilter(named: lutName) {
                LUTFrameProcessorPlugin.lutFilters[filterId] = filter
                lutFilter = filter
                print("[LUT] Loaded filter on demand: \(filterId)")
            }
        }

        guard let activeFilter = lutFilter else {
            return nil
        }

        // Get pixel buffer from frame
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(frame.buffer) else {
            return nil
        }

        // Create CIImage from pixel buffer
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)

        // Apply LUT (make a copy of the filter to be thread-safe)
        activeFilter.setValue(ciImage, forKey: kCIInputImageKey)

        guard let outputImage = activeFilter.outputImage else {
            return nil
        }

        // Render back to the same pixel buffer (in-place modification)
        LUTFrameProcessorPlugin.ciContext.render(outputImage, to: pixelBuffer)

        return nil
    }
}
