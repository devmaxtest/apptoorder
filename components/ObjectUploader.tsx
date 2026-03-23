import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onComplete?: (result: { objectPath: string }) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    if (file.size > maxFileSize) {
      alert(`Le fichier est trop volumineux. Taille max: ${(maxFileSize / 1024 / 1024).toFixed(0)} Mo`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);

    try {
      const response = await fetch("/api/uploads/proxy", {
        method: "POST",
        headers: { "Content-Type": file.type || "image/jpeg" },
        credentials: "include",
        body: file,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }

      const { objectPath } = await response.json();
      onComplete?.({ objectPath });
    } catch (error) {
      console.error("Upload error:", error);
      alert("Erreur lors du téléchargement du fichier");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        multiple={maxNumberOfFiles > 1}
      />
      <Button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={buttonClassName}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Envoi en cours...
          </>
        ) : (
          children
        )}
      </Button>
    </div>
  );
}
