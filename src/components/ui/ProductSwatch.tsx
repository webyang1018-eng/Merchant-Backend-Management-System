import { Briefcase, Flame, Home, Shirt, Watch } from 'lucide-react';
import type { ProductCategory } from '../../types/merchant';

const CATEGORY_ICON: Record<ProductCategory, typeof Shirt> = {
  Apparel: Shirt,
  'Leather Goods': Briefcase,
  'Home & Living': Home,
  Accessories: Watch,
  Wellness: Flame,
};

export function ProductSwatch({
  color,
  category,
  label,
  size = 'md',
}: {
  color: string;
  category?: ProductCategory;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const Icon = category ? CATEGORY_ICON[category] : null;
  const dim = size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-9 w-9 rounded-lg';
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center ring-1 ring-inset ring-black/10 ${dim}`}
      style={{ backgroundColor: `${color}16`, color }}
      aria-hidden="true"
    >
      {Icon ? (
        <Icon className={iconSize} strokeWidth={1.9} />
      ) : (
        <span className="text-xs font-semibold">
          {(label ?? 'P').slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}
