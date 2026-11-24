import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Рендерит оверлеи (модальные окна, шторки, тосты, плавающие панели) в корень
 * приложения, минуя горизонтальную полосу вкладок «Книги / Аудиокниги».
 *
 * Зачем: полоса вкладок имеет `transform` (translate3d) и шириной 200% лежит
 * сразу под двумя экранами. По спецификации CSS у любого элемента с `transform`
 * потомки с `position: fixed` позиционируются относительно НЕГО, а не окна.
 * Из-за этого `fixed inset-0` и `left-1/2` центрировались по двум экранам сразу.
 * Портал выносит оверлей из-под transform, и `fixed` снова считается от окна.
 */
export const OverlayPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (typeof document === 'undefined') return null;
  const target = document.getElementById('ereader-root-app') ?? document.body;
  return createPortal(children, target);
};
