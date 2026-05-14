const DEFAULT_DETAIL_MODAL_OPTIONS = {
  modalWidth: 480,
  modalHeight: 720,
  gap: 18,
  safeGap: 12,
  pointTopOffset: 150,
};

/**
 * 根据地图点位坐标计算详情弹窗位置。
 * 水平方向优先放点位右侧，右侧空间不足则放左侧；
 * 垂直方向默认比点位 top 高 pointTopOffset，并根据容器上下边界修正。
 *
 * @param {[number, number]} pointLocation 点位百分比坐标 [left, top]
 * @param {{ width: number; height: number }} containerSize 地图容器尺寸
 * @param {Partial<typeof DEFAULT_DETAIL_MODAL_OPTIONS>} options 弹窗尺寸和间距配置
 * @returns {Record<string, string>} 可直接绑定到 Vue style 的样式对象
 */
export function calculateDetailModalStyle(pointLocation, containerSize, options = {}) {
  const { modalWidth, modalHeight, gap, safeGap, pointTopOffset } = {
    ...DEFAULT_DETAIL_MODAL_OPTIONS,
    ...options,
  };
  const [pointLeftPercent, pointTopPercent] = pointLocation;
  const { width, height } = containerSize;

  if (!width || !height) {
    return {
      transform: 'none',
      ...(pointLeftPercent <= 50
        ? { left: `calc(${pointLeftPercent}% + ${gap}px)`, right: 'auto' }
        : { right: `calc(${100 - pointLeftPercent}% + ${gap}px)`, left: 'auto' }),
      top: `max(${safeGap}px, calc(${pointTopPercent}% - ${pointTopOffset}px))`,
      bottom: 'auto',
    };
  }

  const pointX = (pointLeftPercent / 100) * width;
  const pointY = (pointTopPercent / 100) * height;
  const actualModalWidth = Math.min(modalWidth, Math.max(0, width - safeGap * 2));
  const actualModalHeight = Math.min(modalHeight, Math.max(0, height - safeGap * 2));
  const canPlaceRight = pointX + gap + actualModalWidth <= width - safeGap;
  const minTop = safeGap;
  const maxTop = Math.max(safeGap, height - actualModalHeight - safeGap);
  const targetTop = pointY - pointTopOffset;
  const modalTop = Math.min(Math.max(targetTop, minTop), maxTop);

  return {
    transform: 'none',
    ...(canPlaceRight
      ? { left: `${pointX + gap}px`, right: 'auto' }
      : { right: `${width - pointX + gap}px`, left: 'auto' }),
    top: `${modalTop}px`,
    bottom: 'auto',
  };
}