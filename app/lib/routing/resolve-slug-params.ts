import type { RouteEntry } from '@/config/ui/initial-app-config';

export type SlugParam = {
  paramName: string;
  paramValue: string;
};

/**
 * Resolves the full chain of dynamic params from a slug array and route list.
 *
 * Example: slug = ['shop', 'bikes', 'kids', 'cheap']
 * Routes: /shop (dynamic, categoryId), /shop/bikes (dynamic, subcategoryId), /shop/bikes/kids (dynamic, itemId)
 * Result:
 *   routeEntry = /shop/bikes/kids
 *   slugParams = [
 *     { paramName: 'categoryId',    paramValue: 'bikes'  },
 *     { paramName: 'subcategoryId', paramValue: 'kids'   },
 *     { paramName: 'itemId',        paramValue: 'cheap'  },
 *   ]
 */
export function resolveSlugParams(
  slug: string[],
  routes: readonly RouteEntry[]
): {
  routeEntry: RouteEntry | undefined;
  slugParams: SlugParam[];
} {
  const path = '/' + slug.join('/');

  // Этап 1: точное совпадение
  let routeEntry = routes.find((r) => r.path === path);
  const slugParams: SlugParam[] = [];

  // Собираем цепочку динамических предков для любой глубины
  if (slug.length >= 2) {
    for (let i = 1; i < slug.length; i++) {
      const ancestorPath = '/' + slug.slice(0, i).join('/');
      const ancestorEntry = routes.find((r) => r.path === ancestorPath && r.isDynamic);
      if (ancestorEntry && ancestorEntry.paramName) {
        slugParams.push({
          paramName: ancestorEntry.paramName,
          paramValue: slug[i],
        });
      }
    }

    // Этап 2: точного совпадения нет — используем ближайшего динамического предка
    if (!routeEntry && slugParams.length > 0) {
      const deepestAncestorPath = '/' + slug.slice(0, slug.length - 1).join('/');
      routeEntry = routes.find((r) => r.path === deepestAncestorPath && r.isDynamic);
    }
  }

  return { routeEntry, slugParams };
}
