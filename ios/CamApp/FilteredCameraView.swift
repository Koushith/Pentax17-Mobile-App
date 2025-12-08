import UIKit
import AVFoundation
import CoreImage

@objc(FilteredCameraViewManager)
class FilteredCameraViewManager: RCTViewManager {
    override func view() -> UIView! {
        return FilteredCameraView()
    }

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
}

@objc(FilteredCameraModule)
class FilteredCameraModule: NSObject {
    private static weak var activeCamera: FilteredCameraView?

    static func setActiveCamera(_ camera: FilteredCameraView?) {
        activeCamera = camera
    }

    @objc func takePhoto(_ options: NSDictionary, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        guard let camera = FilteredCameraModule.activeCamera else {
            rejecter("NO_CAMERA", "No active camera view found.", nil)
            return
        }
        camera.capturePhoto(resolver: resolver, rejecter: rejecter)
    }

    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }
}

class FilteredCameraView: UIView {
    // Session
    private let session = AVCaptureSession()
    private let sessionQueue = DispatchQueue(label: "com.camapp.session")
    private var videoInput: AVCaptureDeviceInput?
    private let videoOutput = AVCaptureVideoDataOutput()
    private let photoOutput = AVCapturePhotoOutput()
    
    // Layers
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var filterLayer: AVSampleBufferDisplayLayer?
    
    // Filter State
    private var currentFilterId: String = "clean_raw"
    private var currentFilter: CIFilter?
    private static var lutFilters: [String: CIFilter] = [:]
    
    // Rendering
    private let context: CIContext = {
        if let device = MTLCreateSystemDefaultDevice() {
            return CIContext(mtlDevice: device, options: [.cacheIntermediates: false])
        }
        return CIContext(options: [.useSoftwareRenderer: false])
    }()
    
    private var isSessionRunning = false
    
    // Props
    @objc var position: String = "back" {
        didSet {
            if position != oldValue {
                configureSession()
            }
        }
    }
    
    @objc var filterId: String = "clean_raw" {
        didSet {
            if filterId != oldValue {
                updateFilter()
            }
        }
    }
    
    @objc var isActive: Bool = true {
        didSet {
            if isActive != oldValue {
                sessionQueue.async {
                    if self.isActive {
                        self.session.startRunning()
                        self.isSessionRunning = self.session.isRunning
                    } else {
                        self.session.stopRunning()
                        self.isSessionRunning = self.session.isRunning
                    }
                }
            }
        }
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupView()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupView()
    }
    
    private func setupView() {
        self.backgroundColor = .black 
        
        FilteredCameraModule.setActiveCamera(self)
        preloadLUTs()
        
        // Create layers immediately so they exist
        let pLayer = AVCaptureVideoPreviewLayer(session: session)
        pLayer.videoGravity = .resizeAspectFill
        self.layer.addSublayer(pLayer)
        self.previewLayer = pLayer
        
        let fLayer = AVSampleBufferDisplayLayer()
        fLayer.videoGravity = .resizeAspectFill
        fLayer.isHidden = true
        self.layer.addSublayer(fLayer)
        self.filterLayer = fLayer
        
        // Initial setup
        configureSession()
    }
    
    deinit {
        FilteredCameraModule.setActiveCamera(nil)
        sessionQueue.async {
            if self.session.isRunning {
                self.session.stopRunning()
            }
        }
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()
        // Always update frames
        previewLayer?.frame = bounds
        filterLayer?.frame = bounds
        
        // Correct orientation
        if let connection = previewLayer?.connection, connection.isVideoOrientationSupported {
            connection.videoOrientation = .portrait
        }
    }
    
    // MARK: - Configuration
    
    private func configureSession() {
        sessionQueue.async {
            self.session.beginConfiguration()
            defer { self.session.commitConfiguration() }
            
            self.session.sessionPreset = .hd1920x1080
            
            // Remove existing input
            if let input = self.videoInput {
                self.session.removeInput(input)
            }
            
            // Add Input
            let pos: AVCaptureDevice.Position = (self.position == "front") ? .front : .back
            if let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: pos),
               let input = try? AVCaptureDeviceInput(device: device),
               self.session.canAddInput(input) {
                self.session.addInput(input)
                self.videoInput = input
            }
            
            // Add Outputs if needed
            if !self.session.outputs.contains(self.videoOutput) {
                 self.videoOutput.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
                 self.videoOutput.setSampleBufferDelegate(self, queue: DispatchQueue(label: "videoQ"))
                 if self.session.canAddOutput(self.videoOutput) {
                     self.session.addOutput(self.videoOutput)
                 }
            }
            
            if !self.session.outputs.contains(self.photoOutput) {
                if self.session.canAddOutput(self.photoOutput) {
                    self.session.addOutput(self.photoOutput)
                }
            }
            
            // Orientation / Mirroring
            if let conn = self.videoOutput.connection(with: .video) {
                if conn.isVideoOrientationSupported { conn.videoOrientation = .portrait }
                if pos == .front && conn.isVideoMirroringSupported { conn.isVideoMirrored = true }
            }
            
            // Start if active
            if self.isActive && !self.session.isRunning {
                self.session.startRunning()
            }
        }
    }
    
    // MARK: - Filter Logic
    
    private func preloadLUTs() {
        let mapping: [String: String] = [
            "kodak_250d": "kodak-250D", 
            "moonrise_kingdom": "moonrise-kingdom",
            "vintage_overlay": "vintage-overlay",
            "clean_raw": "clean-raw"
        ]
        
        for (id, name) in mapping {
            if FilteredCameraView.lutFilters[id] == nil,
               let url = Bundle.main.url(forResource: name, withExtension: "cube"),
               let data = try? String(contentsOf: url, encoding: .utf8),
               let filter = CIFilter(name: "CIColorCubeWithColorSpace") {
                
                // Quick parse
                var size = 0
                var floats: [Float] = []
                for line in data.components(separatedBy: .newlines) {
                    if line.hasPrefix("LUT_3D_SIZE"), let s = Int(line.components(separatedBy: " ").last ?? "") { size = s }
                    else if !line.isEmpty && !line.hasPrefix("TITLE") && !line.hasPrefix("#") {
                        let parts = line.components(separatedBy: " ").compactMap { Float($0) }
                        if parts.count == 3 { floats.append(contentsOf: parts); floats.append(1.0) }
                    }
                }
                
                if size > 0 && floats.count == size * size * size * 4 {
                    let nsData = Data(bytes: floats, count: floats.count * 4)
                    filter.setValue(size, forKey: "inputCubeDimension")
                    filter.setValue(nsData, forKey: "inputCubeData")
                    filter.setValue(CGColorSpaceCreateDeviceRGB(), forKey: "inputColorSpace")
                    FilteredCameraView.lutFilters[id] = filter
                }
            }
        }
    }
    
    private func updateFilter() {
        currentFilter = FilteredCameraView.lutFilters[filterId]
        let useFilter = (filterId != "clean_raw" && currentFilter != nil)
        
        DispatchQueue.main.async {
            self.previewLayer?.isHidden = useFilter
            self.filterLayer?.isHidden = !useFilter
            if useFilter { self.filterLayer?.flush() }
        }
    }

    // MARK: - Capture
    
    func capturePhoto(resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
        let settings = AVCapturePhotoSettings()
        // Reverting to self-delegate for simplicity
        
        self.pendingResolver = resolver
        self.pendingRejecter = rejecter
        
        sessionQueue.async {
            self.photoOutput.capturePhoto(with: settings, delegate: self)
        }
    }
    
    private var pendingResolver: RCTPromiseResolveBlock?
    private var pendingRejecter: RCTPromiseRejectBlock?
}

extension FilteredCameraView: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard !filterLayer!.isHidden, let filter = currentFilter,
              let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
        filter.setValue(ciImage, forKey: kCIInputImageKey)
        
        guard let outputImage = filter.outputImage else { return }
        
        // Render
        var pbuf: CVPixelBuffer?
        CVPixelBufferCreate(nil, CVPixelBufferGetWidth(pixelBuffer), CVPixelBufferGetHeight(pixelBuffer), kCVPixelFormatType_32BGRA, nil, &pbuf)
        
        if let pbuf = pbuf {
            context.render(outputImage, to: pbuf)
            
            var timing = CMSampleTimingInfo(duration: CMSampleBufferGetDuration(sampleBuffer), presentationTimeStamp: CMSampleBufferGetPresentationTimeStamp(sampleBuffer), decodeTimeStamp: CMSampleBufferGetDecodeTimeStamp(sampleBuffer))
            var format: CMFormatDescription?
            CMVideoFormatDescriptionCreateForImageBuffer(allocator: nil, imageBuffer: pbuf, formatDescriptionOut: &format)
            
            if let format = format {
                var sbuf: CMSampleBuffer?
                CMSampleBufferCreateReadyWithImageBuffer(allocator: nil, imageBuffer: pbuf, formatDescription: format, sampleTiming: &timing, sampleBufferOut: &sbuf)
                if let sbuf = sbuf {
                    filterLayer?.enqueue(sbuf)
                }
            }
        }
    }
}

extension FilteredCameraView: AVCapturePhotoCaptureDelegate {
    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        if let error = error {
            pendingRejecter?("CAPTURE_ERR", error.localizedDescription, error)
        } else if let data = photo.fileDataRepresentation() {
            let path = NSTemporaryDirectory() + UUID().uuidString + ".jpg"
            try? data.write(to: URL(fileURLWithPath: path))
            pendingResolver?(["path": path])
        } else {
            pendingRejecter?("CAPTURE_ERR", "No data", nil)
        }
        pendingResolver = nil
        pendingRejecter = nil
    }
}
