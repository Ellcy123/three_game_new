// 物品ID到中文名称的映射
export const ITEM_NAMES: Record<string, string> = {
  wooden_box: '木盒',
  key: '钥匙',
  monitor: '显示器',
  suitcase: '行李箱',
  wardrobe: '衣柜',
  pool: '水潭',
  computer: '电脑',
  cage: '囚笼',
  vase: '花瓶',
  door: '大门'
};

export function getItemName(itemId: string): string {
  return ITEM_NAMES[itemId] || itemId;
}
