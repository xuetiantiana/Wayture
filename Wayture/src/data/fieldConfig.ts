export const fieldColorMap: Record<string, string> = {
  MSRA专区: "rgba(168, 27, 128, 1)",
  魔法森林: "rgba(27, 168, 102, 1)",
  尖叫小镇: "rgba(23, 37, 126, 1)",
  小勇士的冒险亲子乐园: "rgba(10, 151, 229, 1)",
  冒险者俱乐部: "rgba(247, 143, 8, 1)",
  萌宠乐园: "rgba(49, 120, 35, 1)",
};

export const fixedFields = [
  "MSRA专区",
  "魔法森林",
  "尖叫小镇",
  "小勇士的冒险亲子乐园",
  "冒险者俱乐部",
  "萌宠乐园",
];

export function getFieldColor(field: string): string {
  return fieldColorMap[field] || "#64748B";
}