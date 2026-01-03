import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScanLine, Keyboard, ArrowLeft, Check, Camera, X, Upload } from "lucide-react";
import BarcodeScanner from "@/components/BarcodeScanner";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import BottomNav from "@/components/BottomNav";
// Select imports removed


import { saveOfflineLog } from "@/utils/offlineStorage";
import OfflineSyncIndicator from "@/components/OfflineSyncIndicator";

const Scan = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scanMode, setScanMode] = useState<"scanner" | "manual">("scanner");
  const [partNo, setPartNo] = useState("");
  const [partName, setPartName] = useState("");
  const [quantityAll, setQuantityAll] = useState("");
  const [quantityNg, setQuantityNg] = useState("");
  const [ngType, setNgType] = useState(""); // New state for NG Type
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectImage, setRejectImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isNgScanning, setIsNgScanning] = useState(false);
  const [operatorName, setOperatorName] = useState<string>(() => {
    // Load operator name from localStorage if available
    return localStorage.getItem('operator_name') || '';
  });

  // Auto-lookup part when part number is entered
  useEffect(() => {
    if (partNo.length >= 3) {
      lookupPart(partNo);
    } else {
      setPartName("");
    }
  }, [partNo]);

  const lookupPart = async (searchPartNo: string) => {
    setIsLookingUp(true);
    try {
      const { data, error } = await supabase
        .from("parts_master")
        .select("part_name")
        .eq("part_no", searchPartNo)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPartName(data.part_name);
        toast({
          title: "Part Found",
          description: `${data.part_name}`,
          className: "bg-success text-success-foreground",
        });
      } else {
        setPartName("");
        toast({
          title: "Part Not Found",
          description: "Please check the part number",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error looking up part:", error);
      toast({
        title: "Lookup Error",
        description: "Failed to lookup part",
        variant: "destructive",
      });
    } finally {
      setIsLookingUp(false);
    }
  };



  const [factoryName, setFactoryName] = useState("");

  // Factories fetching removed in favor of manual entry + auto-resolve


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!partNo || !partName || !quantityAll || !quantityNg || !operatorName || !factoryName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields including factory location",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    let imageUrl: string | null = null;
    let didUploadImage = false;

    // Helper to attempt offline save
    const saveToOffline = () => {
      const saved = saveOfflineLog({
        part_no: partNo,
        quantity_all_sorting: parseInt(quantityAll),
        quantity_ng: parseInt(quantityNg),
        ng_type: ngType,
        operator_name: operatorName || null,
        factory_id: null, // No ID when offline usually, or we don't know it yet
        factory_name: factoryName,
        reject_image_base64: rejectImage, // Save the base64 string
      });

      if (saved) {
        toast({
          title: "Saved Offline",
          description: "No internet. Log saved locally. Please sync when online.",
          className: "bg-warning text-warning-foreground",
        });
        resetForm();
      } else {
        toast({
          title: "Storage Full",
          description: "Could not save offline. Please connect to internet.",
          variant: "destructive",
        });
      }
    }

    // Reset Form Helper
    const resetForm = () => {
      setPartNo("");
      setPartName("");
      setQuantityAll("");
      setQuantityNg("");
      setNgType("");
      setRejectImage(null);
    }

    // Check online status first
    if (!navigator.onLine) {
      saveToOffline();
      setIsSubmitting(false);
      return;
    }

    try {
      // Upload image if present
      if (rejectImage) {
        imageUrl = await uploadImageToSupabase(rejectImage, partNo);
        didUploadImage = true;
      }

      // Resolve Factory ID (Find or Create)
      let finalFactoryId = null;

      const { data: existingFactory } = await supabase
        .from('factories')
        .select('id')
        .ilike('company_name', factoryName)
        .maybeSingle();

      if (existingFactory) {
        finalFactoryId = existingFactory.id;
      } else {
        // Create new factory
        const { data: newFactory, error: createError } = await supabase
          .from('factories')
          .insert({
            company_name: factoryName,
            location: factoryName // Default location to name
          })
          .select('id')
          .single();

        if (createError) throw createError;
        finalFactoryId = newFactory.id;
      }

      const { error } = await supabase.from("sorting_logs").insert({
        part_no: partNo,
        quantity_all_sorting: parseInt(quantityAll),
        quantity_ng: parseInt(quantityNg),
        reject_image_url: imageUrl,
        operator_name: operatorName || null,
        factory_id: finalFactoryId,
        // @ts-ignore casting to any because ng_type might not be in the generated types yet
        ng_type: ngType,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sorting data logged successfully",
        className: "bg-success text-success-foreground",
      });

      resetForm();
    } catch (error: any) {
      console.error("Error submitting log:", error);

      // If it's a network error (or fetch failure), fall back to offline
      // Note: Supabase JS client generic errors don't always say "Network Error" clearly, 
      // but if the insert failed, we can try robustly.
      // However, if we ALREADY uploaded the image successfully, we shouldn't save the base64 again necessarily,
      // but to be safe and simple: save everything offline.

      // Check if it looks like a network close/timeout or we decide to treat it as one
      if (!navigator.onLine || error.message?.includes("fetch") || error.message?.includes("network")) {
        saveToOffline();
      } else {
        toast({
          title: "Submission Error",
          description: error.message || "Failed to log sorting data",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScanInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && partNo) {
      e.preventDefault();
      document.getElementById("quantity-all")?.focus();
    }
  };


  const handleBarcodeScanned = (decodedText: string) => {
    setPartNo(decodedText.trim());
    toast({
      title: "Barcode Scanned",
      description: `Part No: ${decodedText}`,
      className: "bg-primary text-primary-foreground",
    });
  };

  const handleScanError = (error: string) => {
    toast({
      title: "Scanner Error",
      description: error,
      variant: "destructive",
    });
  };

  const takePicture = async () => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      if (image.base64String) {
        setRejectImage(`data:image/${image.format};base64,${image.base64String}`);
        toast({
          title: "Photo Captured",
          description: "Image ready to upload",
          className: "bg-success text-success-foreground",
        });
      }
    } catch (error: any) {
      console.error("Error taking picture:", error);
      if (error.message !== "User cancelled photos app") {
        toast({
          title: "Camera Error",
          description: "Failed to capture image. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const selectPicture = async () => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
      });

      if (image.base64String) {
        setRejectImage(`data:image/${image.format};base64,${image.base64String}`);
        toast({
          title: "Photo Selected",
          description: "Image ready to upload",
          className: "bg-success text-success-foreground",
        });
      }
    } catch (error: any) {
      console.error("Error selecting picture:", error);
      if (error.message !== "User cancelled photos app") {
        toast({
          title: "Selection Error",
          description: "Failed to select image. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const uploadImageToSupabase = async (base64Image: string, partNo: string): Promise<string | null> => {
    try {
      setIsUploadingImage(true);
      const response = await fetch(base64Image);
      const blob = await response.blob();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `rejects/${partNo}_${timestamp}.jpg`;

      const { data, error } = await supabase.storage
        .from('reject-images')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('reject-images')
        .getPublicUrl(filename);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white pb-24">
      <OfflineSyncIndicator />
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="hover:bg-white/10 text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white">Quality Scan</h1>
          <div className="w-10" />
        </div>

        {/* Mode Toggle */}
        <div className="pb-2">
          <div className="flex gap-2">
            <Button
              variant={scanMode === "scanner" ? "default" : "outline"}
              className={`flex-1 ${scanMode !== "scanner" ? "bg-black text-white border-white/20 hover:bg-white/10" : ""}`}
              onClick={() => setScanMode("scanner")}
            >
              <ScanLine className="h-4 w-4 mr-2" />
              Scanner
            </Button>
            <Button
              variant={scanMode === "manual" ? "default" : "outline"}
              className={`flex-1 ${scanMode !== "manual" ? "bg-black text-white border-white/20 hover:bg-white/10" : ""}`}
              onClick={() => setScanMode("manual")}
            >
              <Keyboard className="h-4 w-4 mr-2" />
              Manual
            </Button>
          </div>
        </div>

        {/* Camera Scanner */}
        {scanMode === "scanner" && (
          <Card className="p-6 bg-[#1e293b]/50 backdrop-blur-md border-white/5 text-white">
            <BarcodeScanner onScanSuccess={handleBarcodeScanned} onScanError={handleScanError} />
          </Card>
        )}

        {/* Scan Form */}
        <Card className="p-6 bg-[#1e293b]/50 backdrop-blur-md border-white/5 text-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Operator Name */}
            <div className="space-y-2">
              <Label htmlFor="operator-name" className="text-lg font-semibold">
                Operator Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="operator-name"
                type="text"
                placeholder="Enter your name"
                value={operatorName}
                onChange={(e) => {
                  const name = e.target.value.trim();
                  setOperatorName(name);
                  // Save to localStorage for next time
                  localStorage.setItem('operator_name', name);
                }}
                className="text-lg h-14 bg-black"
                required
              />
            </div>

            {/* Factory Selection */}
            <div className="space-y-2">
              <Label htmlFor="factory" className="text-lg font-semibold">
                Factory Location <span className="text-destructive">*</span>
              </Label>
              <Input
                id="factory"
                type="text"
                placeholder="Enter factory name/location"
                value={factoryName}
                onChange={(e) => setFactoryName(e.target.value)}
                className="text-lg h-14 bg-black"
              />
            </div>

            {/* Part Number */}
            <div className="space-y-2">
              <Label htmlFor="part-no" className="text-lg font-semibold">
                Part Number
              </Label>
              <Input
                id="part-no"
                type="text"
                placeholder={scanMode === "scanner" ? "Scanned barcode will appear here..." : "Enter part number"}
                value={partNo}
                onChange={(e) => setPartNo(e.target.value.trim())}
                onKeyDown={handleScanInput}
                autoFocus={scanMode === "manual"}
                className="text-lg h-14 bg-black"
                readOnly={scanMode === "scanner"}
              />
            </div>

            {/* Part Name (Auto-filled) */}
            <div className="space-y-2">
              <Label htmlFor="part-name" className="text-lg font-semibold">
                Part Name
              </Label>
              <div className="relative">
                <Input
                  id="part-name"
                  type="text"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  className={`text-lg h-14 ${partName ? "bg-success/10 border-success" : "bg-black"
                    }`}
                  placeholder="Enter or scan part name"
                />
                {partName && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-success" />
                )}
              </div>
            </div>

            {/* Quantity All Sorting */}
            <div className="space-y-2">
              <Label htmlFor="quantity-all" className="text-lg font-semibold">
                Quantity All Sorting
              </Label>
              <Input
                id="quantity-all"
                type="number"
                min="0"
                placeholder="Enter quantity"
                value={quantityAll}
                onChange={(e) => setQuantityAll(e.target.value)}
                className="text-lg h-14 bg-black"
              />
            </div>

            {/* Quantity NG */}
            <div className="space-y-2">
              <Label htmlFor="quantity-ng" className="text-lg font-semibold">
                Quantity NG (Non-Good)
              </Label>
              <Input
                id="quantity-ng"
                type="number"
                min="0"
                placeholder="Enter NG quantity"
                value={quantityNg}
                className="text-lg h-14 bg-black"
              />
            </div>

            {/* NG Type */}
            <div className="space-y-2">
              <Label htmlFor="ng-type" className="text-lg font-semibold">
                NG Type (Defect Description)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="ng-type"
                  type="text"
                  placeholder="e.g. Scratch, Dent, Color Mismatch"
                  value={ngType}
                  onChange={(e) => setNgType(e.target.value)}
                  className="text-lg h-14 bg-black"
                />
                <Button
                  type="button"
                  size="icon"
                  className="h-14 w-14 shrink-0"
                  onClick={() => {
                    setScanMode("manual"); // Stop main scanner to free up camera
                    setIsNgScanning(true);
                  }}
                >
                  <ScanLine className="h-6 w-6" />
                </Button>
              </div>
            </div>

            {/* Reject Image Upload */}
            <div className="space-y-2">
              <Label className="text-lg font-semibold">
                Reject Image (Optional)
              </Label>
              <div className="space-y-3">
                {rejectImage ? (
                  <div className="relative">
                    <div className="relative rounded-lg overflow-hidden border-2 border-border">
                      <img
                        src={rejectImage}
                        alt="Reject preview"
                        className="w-full h-48 object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => setRejectImage(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={takePicture}
                      disabled={isUploadingImage}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Take Photo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={selectPicture}
                      disabled={isUploadingImage}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Photo
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full h-14 text-lg font-semibold"
              disabled={!partName || isSubmitting || isUploadingImage}
            >
              {isUploadingImage
                ? "Uploading Image..."
                : isSubmitting
                  ? "Logging..."
                  : "Submit Log"}
            </Button>
          </form>
        </Card>

        {/* Instructions */}
        <Card className="p-4 bg-muted">
          <p className="text-sm text-muted-foreground">
            {scanMode === "scanner"
              ? "Use the camera to scan barcodes or QR codes. The part number will auto-fill and lookup the part name."
              : "Manually enter the part number, then fill in the quantities."}
          </p>
        </Card>
      </div>
      {/* NG Scan Overlay */}
      {isNgScanning && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white"
            onClick={() => setIsNgScanning(false)}
          >
            <X className="h-8 w-8" />
          </Button>
          <h2 className="text-2xl font-bold mb-6 text-white">Scan NG Type</h2>
          <Card className="w-full max-w-md p-4 bg-[#1e293b] border-white/10">
            <BarcodeScanner
              elementId="ng-scanner-reader"
              onScanSuccess={(code) => {
                setNgType(code);
                setIsNgScanning(false);
                toast({ title: "NG Type Scanned", description: code });
                // Auto prompt for picture after scan
                setTimeout(() => takePicture(), 600);
              }}
              onScanError={(err) => console.log(err)}
            />
          </Card>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Scan;
