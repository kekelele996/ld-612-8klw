/** 纯前端数字自增 id：按存储集合维度递增，删除后也不复用 */
let memorySeq = 0;

export const nextId = (): number => {
  memorySeq += 1;
  return Date.now() * 1000 + memorySeq;
};

/** 从已持久化的行中校准序列，避免重开浏览器后 id 回退碰撞 */
export const seedIdSequence = (rows: { id: number }[]): void => {
  const max = rows.reduce((acc, row) => Math.max(acc, row.id), 0);
  if (max > memorySeq) memorySeq = max;
};
