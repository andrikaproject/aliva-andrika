import { onLocaleChange, t } from './locale.ts';

export function initGalleryCount(): void {
  const grid = document.getElementById('galleryGrid');
  const count = document.getElementById('galleryCount');
  if (!grid || !count) return;

  const paint = () => {
    count.textContent = t('gallery.photoCount', { count: grid.querySelectorAll('.gallery-card').length });
  };

  paint();
  onLocaleChange(paint);
}
