'use client';

import { useState, useEffect } from 'react';
import { toggleFavorite, toggleIntlFavorite, isFavorited, isIntlFavorited } from '@/lib/favorites';

interface Props {
  id: string;
  isIntl?: boolean;
  size?: 'sm' | 'md';
}

export default function FavoriteButton({ id, isIntl = false, size = 'sm' }: Props) {
  const [fav, setFav] = useState(false);

  useEffect(() => {
    setFav(isIntl ? isIntlFavorited(id) : isFavorited(id));
  }, [id, isIntl]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = isIntl ? toggleIntlFavorite(id) : toggleFavorite(id);
    setFav(newState);
  };

  const sizeClass = size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs';

  return (
    <button
      onClick={handleClick}
      className={`rounded flex items-center gap-1 font-medium transition-colors ${sizeClass} ${
        fav
          ? 'bg-orange-500 text-white'
          : 'bg-blue-500 text-white hover:bg-blue-600'
      }`}
    >
      {fav ? '已收藏' : '+ 收藏'}
    </button>
  );
}
