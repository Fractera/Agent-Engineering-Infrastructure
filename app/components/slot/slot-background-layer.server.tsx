import { getZIndexStyle } from '@/config/ui/z-index.config';
import type { BackgroundConfig } from '@/lib/types/background-config';
import { BackgroundVideoClient } from '../media/background-video.client';

type Props = { config: BackgroundConfig };

export function SlotBackgroundLayer({ config }: Props) {
  if (!config || config.bg_type === 'none') return null;

  const blurDataUrl = config.bg_image_blur_data || null;

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={getZIndexStyle('SLOT_BACKGROUND')}
      aria-hidden="true"
      role="presentation"
    >
      {config.bg_type === 'color' && (
        <div className={`absolute inset-0 ${config.bg_color_class}`} />
      )}

      {config.bg_type === 'image' && (
        <>
          {blurDataUrl && (
            <div
              className="absolute bg-cover bg-center"
              style={{
                backgroundImage: `url(${blurDataUrl})`,
                inset: '-20px',
                filter: 'blur(20px)',
                transform: 'scale(1.05)',
              }}
            />
          )}
          {config.bg_image_url && (
            <img
              src={config.bg_image_url}
              className="absolute inset-0 w-full h-full object-cover"
              alt=""
              fetchPriority="low"
            />
          )}
        </>
      )}

      {config.bg_type === 'css_animation' && (
        <div className={`slot-${config.bg_css_animation_name}-bg absolute inset-0`} />
      )}

      {config.bg_type === 'video' && (
        <BackgroundVideoClient config={config} blurDataUrl={blurDataUrl} />
      )}

      {config.bg_overlay_class && (
        <div className={`absolute inset-0 ${config.bg_overlay_class}`} />
      )}
    </div>
  );
}
