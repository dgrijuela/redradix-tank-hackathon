let state = {
  current: null,
  opponent: []
};

const bounds = {
  x: 1420 - 80,
  y: 1080 - 80
};

const maxLife = 100;
const maxSpeed = 100;
const maxMissileRange = 700;
const distanceFromBorderToStop = 180;

const getTankState = async tank => {
  const x = await tank.getX();
  const y = await tank.getY();
  const speed = await tank.getSpeed();
  state.current = {
    x,
    y,
    speed
  };
};

const angles = {
  top: 90,
  bottom: 270,
  left: 180,
  right: 0,
  "top-left": 150, //135
  "top-right": 30, //45
  "bottom-left": 210, //225
  "bottom-right": 330 //315
};

const getPositionsToCheck = (x, y) => {
  if (x < bounds.x / 2) {
    if (y === bounds.y / 2) {
      return ["top-right", "bottom-right", "right"];
    } else if (y < bounds.y / 2) {
      return ["top", "top-right", "right"];
    }
    return ["bottom", "bottom-right", "right"];
  }
  if (y === bounds.y / 2) {
    return ["top-left", "bottom-left", "left"];
  } else if (y < bounds.y / 2) {
    return ["top", "top-left", "left"];
  }
  return ["bottom", "bottom-left", "left"];
};

const getAnglesToCheck = (x, y) =>
  getPositionsToCheck(x, y).map(position => angles[position]);

const initialLogic = async tank => {
  const lastState = state.current;
  const anglesToCheck = getAnglesToCheck(lastState.x, lastState.y);
  for (const angle of anglesToCheck) {
    const scan = await tank.scan(angle, 10);
    const angleInRadians = (angle * Math.PI) / 180;
    if (scan) {
      const x = Math.round(lastState.x + scan * Math.cos(angleInRadians));
      const y = Math.round(lastState.y + scan * Math.sin(angleInRadians));
      state.opponent.push({ x, y });
      await tank.shoot(angle, scan);
    }
  }
};

const getNearestBorder = (x, y) => {
  if (x < bounds.x / 2) {
    if (y === bounds.y / 2) {
      return "left";
    }
    if (y < bounds.y / 2) {
      return "bottom";
    }
    return "top";
  }
  if (y === bounds.y / 2) {
    return "right";
  }
  if (y < bounds.y / 2) {
    return "bottom";
  }
  return "top";
};

const scapeLogic = async tank => {
  const lastState = state.current;
  const nearestBorder = getNearestBorder(lastState.x, lastState.y);
  const angle = angles[nearestBorder];
  await tank.drive(angle, 100);
  let continueWhile = true;
  while (continueWhile) {
    await getTankState(tank);
    const { x, y } = state.current;
    if (
      x < distanceFromBorderToStop ||
      x > bounds.x - distanceFromBorderToStop ||
      y < distanceFromBorderToStop ||
      y > bounds.y - distanceFromBorderToStop
    ) {
      continueWhile = false;
      await tank.drive(angle, 0);
    }
  }
};

const directions = clockwise =>
  clockwise
    ? ["top", "right", "bottom", "left"]
    : ["top", "left", "bottom", "right"];

const coreLogic = async tank => {
  const lastState = state.current;
  const nearestBorder = getNearestBorder(lastState.x, lastState.y);
  let clockwise = false;
  const nearestBorderIndex = directions(clockwise).indexOf(nearestBorder);
  let nextDirectionIndex = nearestBorderIndex;
  let nextDirection = directions(clockwise)[nextDirectionIndex];
  let angle = angles[nextDirection];
  let continueWhile = true;
  while (continueWhile) {
    await getTankState(tank);
    const { x, y, speed } = state.current;
    if (state.current.speed === 0) {
      nextDirectionIndex =
        (nextDirectionIndex + 1) % directions(clockwise).length;
      nextDirection = directions(clockwise)[nextDirectionIndex];
      angle = angles[nextDirection];
      await tank.drive(angle, 100);
    }
    if (nextDirection === "top") {
      if (y > bounds.y - distanceFromBorderToStop) {
        await tank.drive(angle, 0);
      }
    }
    if (nextDirection === "right") {
      if (x > bounds.x - distanceFromBorderToStop) {
        await tank.drive(angle, 0);
      }
    }
    if (nextDirection === "bottom") {
      if (y < distanceFromBorderToStop) {
        await tank.drive(angle, 0);
      }
    }
    if (nextDirection === "left") {
      if (x < distanceFromBorderToStop) {
        await tank.drive(angle, 0);
      }
    }
  }
};

//const getOpponent = async tank => {
//  const lastState = state.current[state.current.length - 1];
//  const anglesToCheck = getAnglesToCheck(lastState.x, lastState.y);
//  for (const angle of anglesToCheck) {
//    //const angle = separation; // * 45;
//    const scan = await tank.scan(angle, 10);
//    const angleInRadians = (angle * Math.PI) / 180;
//    if (scan) {
//      const x = Math.round(lastState.x + scan * Math.cos(angleInRadians));
//      const y = Math.round(lastState.y + scan * Math.sin(angleInRadians));
//      state.opponent.push({ x, y });
//      //const shoot = await tank.shoot(angle, scan);
//      console.log({ shoot });
//      break;
//    }
//  }
//};

//const cheat = tank => {
//  try {
//    tank.tank.lifePoints = maxLife;
//  } catch (e) {}
//};

//const trollWithTheName = tank => {
//  try {
//    tank.tank.id = "voy a ganar";
//  } catch (e) {}
//};
//
//const trollWithTheColor = tank => {
//  const colorInHex = "FF0000";
//  const colorInDecimal = parseInt(colorInHex, 16);
//  try {
//    tank.tank.color = colorInDecimal;
//  } catch (e) {}
//};

async function main(tank) {
  await getTankState(tank);
  await initialLogic(tank);
  await scapeLogic(tank);
  //while (true) {
  //setInterval(async () => {
  await coreLogic(tank);
  console.log(state);
  //}, 1000);
  //}
}
