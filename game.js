'use strict';


class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  plus(vectorObj) {
  	if (!(vectorObj instanceof Vector)) {
  		throw new Error('Можно прибавлять к вектору только вектор типа Vector')
  	} else {
      return new Vector(this.x + vectorObj.x, this.y + vectorObj.y);
    }
  }  
  times(factor) {
    return new Vector(this.x * factor, this.y * factor);
  }
}

class Actor {
  constructor(pos = new Vector(), size = new Vector(1, 1), speed = new Vector()) {
    if (!(pos instanceof Vector) ||
        !(size instanceof Vector) ||
        !(speed instanceof Vector)) {
          throw Error('pos, size, speed не являются объектом типа Actor');
        }
    this.pos = pos;
    this.size = size;
    this.speed = speed;
    }

  act() {}

  get left() {
    return this.pos.x;
  }

  get top() {
    return this.pos.y;
  }

  get right() {
    return this.pos.x + this.size.x;
  }

  get bottom() {
    return this.pos.y + this.size.y;
  }

  get type() {
    return 'actor';
  }


    isIntersect(actor) {
    if (!(actor instanceof Actor) || actor === undefined) {
          throw Error('Объект должен быть типа Actor!');
    }

    if (actor === this || actor.size.x < 0 || actor.size.y < 0) {
          return false;
      }

  return !(actor.left >= this.right || actor.right <= this.left || actor.top >= this.bottom || actor.bottom <= this.top);
  }
}
////

class Level {
  constructor(grid = [], actors = []) {
    this.grid = grid;
    this.actors = actors;
    this.height = grid.length;
    this.width = grid.reduce((cell, row) => row.length > cell ? row.length : cell, 0);
    this.status = null;
    this.finishDelay = 1;
    this.player = actors.find(elem => elem.type === 'player');
  }

  isFinished() {
    return this.status !== null && this.finishDelay < 0 ? true : false;
  }

  actorAt(actor) {
    if (!actor || !(actor instanceof Actor)) {
      throw Error('Объект должен быть типа Actor!');
    }
    return this.actors.find(el => el.isIntersect(actor));
  }

  isObstacle(x, y) {
    const wall = 'wall';
    const lava = 'lava';
    const grid = this.grid;
    if (grid[y] && grid[y][x] && ((grid[y][x] === wall) || (grid[y][x] === lava))) {
      return true;
    } else {
      return false;
    }
  }

  obstacleAt(nextPos, size) {
    if (!(nextPos instanceof Vector) ||
        !(size instanceof Vector)) {
      throw Error('Объекты должны быть типа Vector!');
    }
    const sizeX = size.x - 0.0001;
    const sizeY = size.y - 0.0001;
    const grid = this.grid;
    const x = nextPos.x;
    const y = nextPos.y;
    const left = Math.floor(x);
    const top = Math.floor(y);
    const bottom = Math.floor(y + sizeY);
    const right = Math.floor(x + sizeX);
    const middle = Math.round(top + sizeY / 2);
    
    const horizontal_directions = [left, right];
    const vertical_directions = [top, bottom, middle];
    for (let hd of horizontal_directions) {
      for (let vd of vertical_directions) {
        if (this.isObstacle(hd, vd)) {
          return grid[vd][hd];
        }
      }
    }
    
    if (left < 0 || x + sizeX > this.width || top < 0) {
      return 'wall';
    }
    if (y + sizeY > this.height) {
      return 'lava';
    }
  }

  removeActor(actor) {
    this.actors = this.actors.filter(elem => elem !== actor);
  }

  noMoreActors(type) {
    const result = this.actors.filter(elem => elem.type === type);
    return result.length > 0 ? false : true;
  }

  playerTouched(type, actor) {
    if (this.status !== null) {
      return;
    }
    if (type === 'lava' || type === 'fireball') {
      this.status = 'lost';
    } else if (type === 'coin') {
      this.removeActor(actor);
      if (!this.actors.find(elem => elem.type === 'coin')) {
        this.status = 'won';
      }
    }
  }
}

class LevelParser {
  constructor(actorDict = {}) {
    this.actorDict = Object.assign({}, actorDict);
  }

  actorFromSymbol(symbol) {
    return this.actorDict[symbol];
  }

  obstacleFromSymbol(symbol) {
    switch(symbol) {
      case 'x':
        return 'wall';
      case '!':
        return 'lava';
    }
  }

  createGrid(plan = []) {
    return plan.map(row => row.split('').map(symbol => this.obstacleFromSymbol(symbol)));
  }

  createActors(plan) {
    const actors = [];
    for(let y = 0; y < plan.length; y++) {
      for(let x = 0; x < plan[y].length; x++) {
        const TypeOfObj = this.actorFromSymbol(plan[y][x]);
        if (typeof TypeOfObj === 'function') {
          const actor = new TypeOfObj(new Vector(x, y));
          if (actor instanceof Actor) {
            actors.push(actor);
          }
        }
      }
    }
    return actors;
  }

  parse(plan) {
    return new Level(this.createGrid(plan), this.createActors(plan));
  }
}

class Player extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5), new Vector(0, 0));
  }

  get type() {
    return 'player';
  }
}

class Coin extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6), new Vector(0, 0));

    this.startPos = this.pos;
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * 2 * Math.PI;
  }

  get type() {
    return 'coin';
  }

  updateSpring(time = 1) {
    this.spring += this.springSpeed * time;
  }

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }

  getNextPosition(time = 1) {
    this.updateSpring(time);
    return this.startPos.plus(this.getSpringVector());
  }

  act(time, level) {
    this.pos = this.getNextPosition(time);
  }
}

class Fireball extends Actor {
  constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
    super(pos, new Vector(1, 1), speed);
  }

  get type() {
    return 'fireball';
  }

  getNextPosition(time = 1) {
    return this.pos.plus(this.speed.times(time));
  }

  handleObstacle() {
    this.speed = this.speed.times(-1);
  }

  act(time, level) {
    const nextPos = this.getNextPosition(time);
    if (level.obstacleAt(nextPos, this.size)) {
      this.handleObstacle();
    } else {
      this.pos = nextPos;
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(2, 0));
  }
}

class VerticalFireball extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(0, 2));
  }
}

class FireRain extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(0, 3));
    this.startPos = pos;
  }

  handleObstacle() {
    this.pos = this.startPos;
  }
}

const actorDict = {
  '@': Player,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball,
  'v': Fireball
}
const parser = new LevelParser(actorDict);

loadLevels().then(schemasStr => {
	let schemas = JSON.parse(schemasStr);
  return runGame(schemas, parser, DOMDisplay);
}).then(() => {
	alert('Вы выиграли!')
});