let state = {
  current: {
    x: 0,
    y: 0,
    speed: 0
  },
  future: {
    x: 0,
    y: 0,
    speed: 0
  }
};

const bounds = {
  x: 800,
  y: 1000
};

const initialLogic = async () => {
  const x = await tank.getX();
  const y = await tank.getY();
  const speed = await tank.getSpeed();
  state.current = {
    x,
    y,
    speed
  };
};

async function main(tank) {
  //setTimeout(() => {
  //  console.log({ state });
  //}, 1000);
  //while (true) {
  //  initialLogic();
  //}
  await tank.drive(0, 75);
  while ((await tank.getX()) < 800) {
    null;
  }
  await tank.drive(0, 0);
}
