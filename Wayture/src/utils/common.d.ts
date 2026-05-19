export type TriggerModalStyle = Record<string, string>;

export type TriggerModalLayoutOptions = Partial<{
	width: number;
	height: number;
	gap: number;
	safeGap: number;
}>;

export function calculateTriggerModalStyle(
	triggerElement: HTMLElement,
	options?: TriggerModalLayoutOptions
): TriggerModalStyle;
