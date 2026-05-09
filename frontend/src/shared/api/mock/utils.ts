export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const randomLatency = (): number => 200 + Math.floor(Math.random() * 500);
