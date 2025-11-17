import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}

const BarcodeScanner = ({ onScanSuccess, onScanError }: BarcodeScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState<string>("");

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current && isScanning) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current?.clear();
          })
          .catch((err) => console.error("Failed to stop scanner:", err));
      }
    };
  }, [isScanning]);

  const startScanning = async () => {
    try {
      setCameraError("");
      const html5QrCode = new Html5Qrcode("barcode-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Success callback
          onScanSuccess(decodedText);
          stopScanning();
        },
        (errorMessage) => {
          // Error callback (can be ignored for continuous scanning)
          // console.log("Scan error:", errorMessage);
        }
      );

      setIsScanning(true);
      setHasPermission(true);
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      setCameraError(err.message || "Failed to start camera");
      setHasPermission(false);
      if (onScanError) {
        onScanError(err.message || "Failed to start camera");
      }
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        setIsScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div
          id="barcode-reader"
          className={`w-full rounded-lg overflow-hidden ${
            isScanning ? "border-2 border-primary" : "bg-muted"
          }`}
          style={{ minHeight: isScanning ? "300px" : "200px" }}
        />
        {!isScanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
            <Camera className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground text-center px-4">
              {hasPermission === false
                ? "Camera permission denied. Please enable camera access."
                : "Click 'Start Camera' to begin scanning"}
            </p>
            {cameraError && (
              <p className="text-sm text-destructive mt-2 px-4 text-center">{cameraError}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {!isScanning ? (
          <Button onClick={startScanning} className="w-full h-12" size="lg">
            <Camera className="h-5 w-5 mr-2" />
            Start Camera
          </Button>
        ) : (
          <Button onClick={stopScanning} variant="destructive" className="w-full h-12" size="lg">
            <CameraOff className="h-5 w-5 mr-2" />
            Stop Camera
          </Button>
        )}
      </div>

      {isScanning && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
          <p className="text-sm text-primary font-medium text-center">
            📷 Point camera at barcode or QR code
          </p>
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner;
