import type { DepthContainerStyles } from '@/config/ui/initial-app-config';
import { getTemplateDefaults } from '@/config/ui/template-registry';

/**
 * Накладывает пользовательские оверрайды поверх дефолтов шаблона.
 * Если пользователь задал значение — используется оно.
 * Если нет — используется дефолт шаблона.
 */
export function mergeTemplateStyles(
  templateType: string,
  userOverrides?: Partial<DepthContainerStyles> | null
): Required<DepthContainerStyles> {
  const defaults = getTemplateDefaults(templateType).wrappers;
  if (!userOverrides) return defaults;

  return {
    shellClasses:    userOverrides.shellClasses    ?? defaults.shellClasses,
    overlayClasses:  userOverrides.overlayClasses  ?? defaults.overlayClasses,
    contentClasses:  userOverrides.contentClasses  ?? defaults.contentClasses,
    metaClasses:     userOverrides.metaClasses     ?? defaults.metaClasses,
    textClasses:     userOverrides.textClasses     ?? defaults.textClasses,
    mediaClasses:    userOverrides.mediaClasses    ?? defaults.mediaClasses,
    childrenClasses: userOverrides.childrenClasses ?? defaults.childrenClasses,
    widgetClasses:   userOverrides.widgetClasses   ?? defaults.widgetClasses,
    widgetAnimation: userOverrides.widgetAnimation ?? defaults.widgetAnimation,
  };
}
