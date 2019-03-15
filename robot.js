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
const distanceFromBorderToStop = 320;
const speedToStartAttacking = 50;

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

const getInitialPositionsToCheck = (x, y) => {
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
  getInitialPositionsToCheck(x, y).map(position => angles[position]);

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

const doNotCollideLogic = async (tank, { angle, nextDirection }) => {
  const { x, y } = state.current;
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
};

const clockwise = true;

const initialMoveArroundLogic = async tank => {
  const { x, y } = state.current;
  const nearestBorder = getNearestBorder(x, y);
  const nearestBorderIndex = directions(clockwise).indexOf(nearestBorder);
  const nextDirectionIndex = nearestBorderIndex;
  const nextDirection = directions(clockwise)[nextDirectionIndex];
  const angle = angles[nextDirection];
  return { angle, nextDirection, nextDirectionIndex };
};

const getNextDirectionIndex = index => {
  return (index + 1) % directions(clockwise).length;
};

const moveArroundLogic = async (
  tank,
  { nextDirectionIndex, nextDirection, angle }
) => {
  const { x, y, speed } = state.current;
  if (speed === 0) {
    nextDirectionIndex = getNextDirectionIndex(nextDirectionIndex);
    nextDirection = directions(clockwise)[nextDirectionIndex];
    angle = angles[nextDirection];
    await tank.drive(angle, 100);
  }
  return { nextDirectionIndex, nextDirection, angle };
};

const getCenterPositionsToCheck = centerDirection => {
  switch (centerDirection) {
    case "top":
      return ["top-left", "top", "top-right"];
    case "right":
      return ["top-right", "right", "bottom-right"];
    case "bottom":
      return ["bottom-left", "bottom", "bottom-right"];
    case "left":
      return ["top-left", "left", "bottom-left"];
  }
};

const getOppositePositionToCheck = nextDirection => {
  switch (nextDirection) {
    case "top":
      return "bottom";
    case "right":
      return "left";
    case "bottom":
      return "top";
    case "left":
      return "right";
  }
};

const scanAttack = async (tank, scan, angle) => {
  const angleInRadians = (angle * Math.PI) / 180;
  const lastState = state.current;
  const x = Math.round(lastState.x + scan * Math.cos(angleInRadians));
  const y = Math.round(lastState.y + scan * Math.sin(angleInRadians));
  state.opponent.push({ x, y });
  await tank.shoot(angle, scan);
};

const scanCenterLogic = async (
  tank,
  { angle, nextDirection, nextDirectionIndex }
) => {
  const centerDirectionIndex = getNextDirectionIndex(nextDirectionIndex);
  const centerDirection = directions(clockwise)[centerDirectionIndex];
  const positionsToCheck = [
    ...getCenterPositionsToCheck(centerDirection),
    getOppositePositionToCheck(nextDirection)
  ];

  const sameDirectionAngle = angles[nextDirection];
  const sameDirectionScan = await tank.scan(sameDirectionAngle, 10);
  if (sameDirectionScan) {
    await scanAttack(tank, sameDirectionScan, sameDirectionAngle);
  }

  for (const position of positionsToCheck) {
    const angle = angles[position];
    const scan = await tank.scan(angle, 10);
    if (scan) await scanAttack(tank, scan, angle);
  }
};

const coreLogic = async tank => {
  let moveArroundState = await initialMoveArroundLogic(tank);
  while (true) {
    await getTankState(tank);
    moveArroundState = await moveArroundLogic(tank, moveArroundState);
    await doNotCollideLogic(tank, moveArroundState);
    if (state.current.speed > speedToStartAttacking) {
      await scanCenterLogic(tank, moveArroundState);
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
  await coreLogic(tank);
}
