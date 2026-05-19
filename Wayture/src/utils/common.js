const DEFAULT_TRIGGER_MODAL_LAYOUT = {
	width: 520,
	height: 720,
	gap: 18,
	safeGap: 24,
};

export function calculateTriggerModalStyle(triggerElement, options = {}) {
	const { width, height, gap, safeGap } = {
		...DEFAULT_TRIGGER_MODAL_LAYOUT,
		...options,
	};
	const rect = triggerElement.getBoundingClientRect();
	const pointX = rect.left + rect.width / 2;
	const pointY = rect.top + rect.height / 2;
	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;
	const modalWidth = Math.min(width, viewportWidth - safeGap * 2);
	const modalHeight = Math.min(height, viewportHeight - safeGap * 2);
	const canPlaceRight = pointX + gap + modalWidth <= viewportWidth - safeGap;
	const targetLeft = canPlaceRight ? pointX + gap : pointX - gap - modalWidth;
	const maxLeft = Math.max(safeGap, viewportWidth - modalWidth - safeGap);
	const maxTop = Math.max(safeGap, viewportHeight - modalHeight - safeGap);
	const left = Math.min(Math.max(targetLeft, safeGap), maxLeft);
	const top = Math.min(Math.max(pointY - modalHeight / 2, safeGap), maxTop);

	return {
		left: `${left}px`,
		top: `${top}px`,
		right: 'auto',
		bottom: 'auto',
		transform: 'none',
	};
}
