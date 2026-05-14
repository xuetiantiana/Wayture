export type DetailModalStyle = Record<string, string>;

export type DetailModalContainerSize = {
  width: number;
  height: number;
};

export type DetailModalOptions = Partial<{
  modalWidth: number;
  modalHeight: number;
  gap: number;
  safeGap: number;
  pointTopOffset: number;
}>;

export function calculateDetailModalStyle(
  pointLocation: [number, number],
  containerSize: DetailModalContainerSize,
  options?: DetailModalOptions
): DetailModalStyle;