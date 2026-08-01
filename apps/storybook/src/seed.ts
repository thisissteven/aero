const users = ['Zoe', 'Alice', 'Bob'];

export function getRandomUserImage() {
  const user = users[Math.floor(Math.random() * users.length)];
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${user}`;
}

export function getRandomFruitImage() {
  return 'https://api.dicebear.com/9.x/icons/svg';
}
