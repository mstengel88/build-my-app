import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ImageOff } from 'lucide-react';

interface PhotoThumbnailProps {
  filePath: string;
  onClick: (signedUrl: string) => void;
}

export const PhotoThumbnail = ({ filePath, onClick }: PhotoThumbnailProps) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadSignedUrl = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('work-photos')
          .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (error) throw error;
        setSignedUrl(data.signedUrl);
      } catch (err) {
        console.error('Error loading photo thumbnail:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadSignedUrl();
  }, [filePath]);

  if (loading) {
    return (
      <div className="w-10 h-10 rounded border border-border bg-muted flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className="w-10 h-10 rounded border border-border bg-muted flex items-center justify-center">
        <ImageOff className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <button
      onClick={() => onClick(signedUrl)}
      className="w-10 h-10 rounded border border-border overflow-hidden hover:ring-2 hover:ring-primary hover:ring-offset-1 transition-all cursor-pointer"
    >
      <img
        src={signedUrl}
        alt="Work log photo"
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    </button>
  );
};
