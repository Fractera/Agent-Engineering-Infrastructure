// Ported verbatim from the 22slots reference (lib/types/menu-category.ts).

export type MenuCategoryTranslation = {
  id: string;
  categoryId: string;
  lang: string;
  label: string;
};

export type MenuCategory = {
  id: string;
  slotName: string;
  imageUrl: string | null;
  textDirection: 'ltr' | 'rtl' | 'auto';
  allowedRoles: string[];
  orderIndex: number;
  translations: MenuCategoryTranslation[];
};
