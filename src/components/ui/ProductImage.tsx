import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { getProductImageUrl } from '../../utils/imageUrl';

interface ProductImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt: string;
  fallbackIconSize?: number;
  containerClassName?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  fallbackIconSize = 20,
  className = 'w-full h-full object-cover',
  containerClassName,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const resolvedUrl = getProductImageUrl(src);

  useEffect(() => {
    setHasError(false);
    setDataUrl(null);
  }, [src]);

  if (!src || hasError || (!resolvedUrl && !dataUrl)) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center text-slate-500 select-none ${containerClassName || ''}`}>
        <Package style={{ width: fallbackIconSize, height: fallbackIconSize }} />
      </div>
    );
  }

  return (
    <img
      src={dataUrl || resolvedUrl || undefined}
      alt={alt}
      className={className}
      onError={() => {
        // If protocol fetch failed, try safe IPC base64 fallback before giving up
        if (window.electronAPI?.getProductImageData && src && !dataUrl) {
          window.electronAPI
            .getProductImageData(src)
            .then((res) => {
              if (res.success && res.data) {
                setDataUrl(res.data);
              } else {
                setHasError(true);
              }
            })
            .catch(() => setHasError(true));
        } else {
          setHasError(true);
        }
      }}
      {...props}
    />
  );
};
