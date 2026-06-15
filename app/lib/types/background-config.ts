// Ported verbatim from the 22slots reference (lib/types/background-config.ts).

export type BackgroundConfig = {
  bg_type: 'none' | 'color' | 'image' | 'video' | 'css_animation';
  bg_color_class: string;
  bg_image_url: string;
  bg_image_blur_data: string;
  bg_video_url: string;
  bg_video_poster_url: string;
  bg_overlay_class: string;
  bg_css_animation_name: string;
};

export type BrandBookBgEntry = {
  bgType: 'none' | 'color' | 'image' | 'video' | 'css_animation';
  bgColorClass: string;
  bgImageUrl: string;
  bgImageBlurData: string;
  bgVideoUrl: string;
  bgVideoPosterUrl: string;
  bgOverlayClass: string;
  bgCssAnimationName: string;
};
