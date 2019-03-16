let state = {
  last: null,
  current: null
};

const bounds = {
  x: 1420 - 80,
  y: 1080 - 80
};

const maxSpeed = 75;
const maxMissileRange = 700;
const distanceFromBorderToStop = 320;
const speedToStartAttacking = 50;

const getTankState = async tank => {
  const x = await tank.getX();
  const y = await tank.getY();
  const speed = await tank.getSpeed();
  state.last = state.current;
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
    scan && (await attack(tank, scan, angle, 1));
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
  await tank.drive(angle, maxSpeed);
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

const directions = () =>
  clockwise
    ? ["top", "right", "bottom", "left"]
    : ["top", "left", "bottom", "right"];

const doNotCollideLogic = async tank => {
  const { x, y } = state.current;
  const { direction, angle } = getDirectionAndAngle();
  if (direction === "top") {
    if (y > bounds.y - distanceFromBorderToStop) {
      await tank.drive(angle, 0);
    }
  }
  if (direction === "right") {
    if (x > bounds.x - distanceFromBorderToStop) {
      await tank.drive(angle, 0);
    }
  }
  if (direction === "bottom") {
    if (y < distanceFromBorderToStop) {
      await tank.drive(angle, 0);
    }
  }
  if (direction === "left") {
    if (x < distanceFromBorderToStop) {
      await tank.drive(angle, 0);
    }
  }
};

let clockwise = true;
let directionIndex = null;

const getDirectionAndAngle = () => {
  const direction = directions()[directionIndex];
  const angle = angles[direction];
  return { direction, angle };
};

const initialMoveArroundLogic = async tank => {
  const { x, y } = state.current;
  const nearestBorder = getNearestBorder(x, y);
  const nearestBorderIndex = directions().indexOf(nearestBorder);
  directionIndex = nearestBorderIndex;
};

const getNextDirectionIndex = () => {
  return (directionIndex + 1) % directions().length;
};

const getPreviousDirectionIndex = () => {
  return directionIndex === 0 ? 3 : directionIndex - 1;
};

const moveArroundLogic = async tank => {
  const { x, y, speed } = state.current;
  if (speed === 0) {
    directionIndex = getNextDirectionIndex();
    const { angle } = getDirectionAndAngle();
    await tank.drive(angle, maxSpeed);
  }
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

const getOppositePositionToCheck = direction => {
  switch (direction) {
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

const attack = async (tank, scan, angle, number = 1) => {
  if (number === 2) {
    await tank.shoot(angle, scan);
    await tank.shoot(angle + (Math.random() > 0.5 ? -10 : +10), scan);
  } else {
    await tank.shoot(angle, scan);
  }
};

const ensureStraightLogic = async tank => {
  const { x: lastX, y: lastY } = state.last;
  const { x, y } = state.current;
  // Vertical movement
  if ([0, 2].includes(directionIndex)) {
    if (Math.abs(x - lastX) > 10) {
      const { angle } = getDirectionAndAngle();
      await tank.drive(angle, maxSpeed);
    }
  } else {
    if (Math.abs(y - lastY) > 10) {
      const { angle } = getDirectionAndAngle();
      await tank.drive(angle, maxSpeed);
    }
  }
};

const getCenterDirectionIndex = () => {
  if (clockwise) {
    switch (directionIndex) {
      case 0:
        return 1;
      case 1:
        return 2;
      case 2:
        return 3;
      case 3:
        return 0;
    }
  } else {
    switch (directionIndex) {
      case 0:
        return 1;
      case 3:
        return 0;
      case 2:
        return 3;
      case 1:
        return 2;
    }
  }
};

const scanCenterLogic = async tank => {
  const { angle: sameDirectionAngle, direction } = getDirectionAndAngle();

  const sameDirectionScan = await tank.scan(sameDirectionAngle, 10);
  sameDirectionScan &&
    (await attack(tank, sameDirectionScan, sameDirectionAngle, 2));

  const centerDirectionIndex = getCenterDirectionIndex();
  const centerDirection = directions()[centerDirectionIndex];
  const positionsToCheck = [
    ...getCenterPositionsToCheck(centerDirection),
    getOppositePositionToCheck(direction)
  ];

  for (const position of positionsToCheck) {
    const angle = angles[position];
    const scan = await tank.scan(angle, 10);
    if (scan) await attack(tank, scan, angle, 2);
  }
};

const coreLogic = async tank => {
  await initialMoveArroundLogic(tank);
  while (true) {
    await getTankState(tank);
    await moveArroundLogic(tank);
    await doNotCollideLogic(tank);
    await ensureStraightLogic(tank);
    if (state.current.speed > speedToStartAttacking) {
      await scanCenterLogic(tank);
    }
  }
};

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
