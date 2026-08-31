import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";

interface ProductInfo {
  name: string;
  brand?: string;
  category?: string;
  image?: string;
}

export const useBarcodeScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const { toast } = useToast();

  // Try Open Food Facts first
  const lookupOpenFoodFacts = async (barcode: string): Promise<ProductInfo | null> => {
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
      );
      const data = await response.json();

      if (data.status === 1 && data.product) {
        return {
          name: data.product.product_name || data.product.product_name_en || null,
          brand: data.product.brands,
          category: data.product.categories?.split(",")[0],
          image: data.product.image_small_url,
        };
      }
      return null;
    } catch (error) {
      console.error("Open Food Facts lookup error:", error);
      return null;
    }
  };

  // Try USDA FoodData Central as fallback
  const lookupUSDA = async (barcode: string): Promise<ProductInfo | null> => {
    try {
      // USDA FoodData Central API (free, no key required for basic search)
      const response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?query=${barcode}&dataType=Branded&pageSize=1&api_key=DEMO_KEY`
      );
      const data = await response.json();

      if (data.foods && data.foods.length > 0) {
        const food = data.foods[0];
        return {
          name: food.description || food.brandName || null,
          brand: food.brandOwner || food.brandName,
          category: food.foodCategory,
        };
      }
      return null;
    } catch (error) {
      console.error("USDA lookup error:", error);
      return null;
    }
  };

  // Combined lookup - tries both APIs
  const lookupBarcode = async (barcode: string): Promise<ProductInfo | null> => {
    // Try Open Food Facts first (better for international products)
    let result = await lookupOpenFoodFacts(barcode);
    
    if (result && result.name) {
      return result;
    }

    // Fallback to USDA (better for US products)
    result = await lookupUSDA(barcode);
    
    if (result && result.name) {
      return result;
    }

    return null;
  };

  const checkPermissions = useCallback(async () => {
    try {
      // Check if we're on HTTPS or localhost (required for camera)
      const isSecure = window.location.protocol === 'https:' || 
                       window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1';
      
      if (!isSecure) {
        console.warn("Camera requires HTTPS or localhost");
        setHasPermission(false);
        return;
      }

      // Check if permissions API is available
      if (navigator.permissions) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
          setHasPermission(permissionStatus.state === 'granted');

          // Listen for permission changes
          permissionStatus.addEventListener('change', () => {
            setHasPermission(permissionStatus.state === 'granted');
          });
        } catch (permError) {
          // Some browsers don't support camera permission query
          console.log("Permission API not fully supported, will try getUserMedia directly");
          setHasPermission(null);
        }
      } else {
        // Fallback for browsers without permissions API
        setHasPermission(null);
      }
    } catch (error) {
      console.error("Permission check error:", error);
      setHasPermission(null);
    }
  }, []);

  const startScanning = useCallback(async () => {
    try {
      // Check if we're on HTTPS or localhost
      const isSecure = window.location.protocol === 'https:' || 
                       window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1';
      
      if (!isSecure) {
        toast({
          title: "Camera requires secure connection",
          description: "Please access this page via HTTPS to use the camera.",
          variant: "destructive",
        });
        setHasPermission(false);
        return;
      }

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: "Camera not supported",
          description: "Your browser doesn't support camera access.",
          variant: "destructive",
        });
        setHasPermission(false);
        return;
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      });

      setHasPermission(true);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          video.onloadedmetadata = () => {
            video.play().then(resolve).catch(reject);
          };
          video.onerror = reject;
        });
      }

      setIsScanning(true);
    } catch (error: any) {
      console.error("Camera access error:", error);
      setHasPermission(false);

      let errorMessage = "Please allow camera access to scan barcodes";
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = "Camera permission denied. Please enable camera access in your browser settings and refresh the page.";
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = "No camera found on this device.";
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = "Camera is already in use by another application.";
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = "Camera constraints not satisfied. Trying fallback...";
        // Try with simpler constraints
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasPermission(true);
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }
          setIsScanning(true);
          return;
        } catch {
          errorMessage = "Could not access camera with any settings.";
        }
      } else if (error.name === 'SecurityError') {
        errorMessage = "Camera access blocked for security reasons. Use HTTPS.";
      }

      toast({
        title: "Camera access failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopScanning = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  const scanBarcode = useCallback(async (): Promise<string | null> => {
    if (!videoRef.current || !isScanning) return null;

    try {
      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserMultiFormatReader();
      }

      const result = await codeReaderRef.current.decodeOnceFromVideoDevice(undefined, videoRef.current);
      const barcode = result.getText();
      setScannedCode(barcode);
      return barcode;
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        console.error("Barcode scanning error:", error);
      }
      return null;
    }
  }, [isScanning]);

  const captureFrame = useCallback((): ImageData | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // BrowserMultiFormatReader doesn't have a reset method, just clear the ref
      codeReaderRef.current = null;
      stopScanning();
    };
  }, [stopScanning]);

  return {
    isScanning,
    hasPermission,
    scannedCode,
    videoRef,
    canvasRef,
    startScanning,
    stopScanning,
    scanBarcode,
    captureFrame,
    lookupBarcode,
  };
};
