const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const RADIUS = 8;
const PRECISION = 1000;
const GRAVITY = 0.3;
const ELASTICITY = 0.8;

let leftClick = false;
let mouseX=0;
let mouseY=0;
let friction = 0.05;
let displayScale = 10;

let Balls=[];
let Walls=[];

class Vector{
  constructor(x,y){
    this.x = x;
    this.y = y;
  }

  add(v){
    return new Vector(this.x+v.x, this.y+v.y);
  }

  sub(v){
    return new Vector(this.x-v.x, this.y-v.y);
  }

  mag(){
    return Math.sqrt(this.x**2 + this.y**2);
  }

  mul(n){
    return new Vector(this.x*n, this.y*n);
  }

  normal(){
    return new Vector(-this.y, this.x).unit();
  }

  unit(){
    if(this.mag() === 0){
      return new Vector(0,0);
    }else{
      return new Vector(this.x/this.mag(), this.y/this.mag());
    }
  }

  static dot(v1, v2){
    return v1.x*v2.x+v1.y*v2.y;
  }
}

class Wall{
  constructor(x1, y1, x2, y2){
    this.start = new Vector(x1, y1);
    this.end = new Vector(x2, y2);
    Walls.push(this);
  }

  render(){
    ctx.beginPath();
    ctx.moveTo(this.start.x, this.start.y);
    ctx.lineTo(this.end.x, this.end.y);
    ctx.strokeStyle = "black";
    ctx.stroke();
  }

  wallUnit(){
    return this.end.sub(this.start).unit();
  }
}

class Matrix{
  constructor(rows, cols){
    this.rows = rows;
    this.cols = cols;
    this.data = [];

    for(let i=0; i<this.rows; i++){
      this.data[i] = [];
      for(let j=0; j<this.cols; j++){
        this.data[i][j] = 0;
      }
    }
  }

  multiplyVec(vec){
    let result = new Vector(0,0);
    result.x = this.data[0][0]*vec.x + this.data[0][1]*vec.y;
    result.y = this.data[1][0]*vec.x + this.data[1][1]*vec.y;
    return result;
  }
}

class Ball {
  constructor(x, y, r)
  {
    this.r = r;
    this.pos = new Vector(x,y);
    this.vel = new Vector(0,0);
    this.acc=new Vector(0, 0);
    Balls.push(this);
  }

  render(){
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.r, 0, 2*Math.PI);
    ctx.strokeStyle = "#ea4c89";
    ctx.stroke();
    ctx.fillStyle="#ea4c89";
    ctx.fill();
  }

  move(){
    this.acc.y+=GRAVITY;

    // 가속
    this.vel.x+=this.acc.x;
    this.vel.y+=this.acc.y;

    this.acc.x=0;
    this.acc.y=0;

    // 저항
    this.vel.x*=1-friction;
    this.vel.y*=1-friction;

    // 이동
    this.pos.x+=this.vel.x;
    this.pos.y+=this.vel.y;
  }

  constraint(){
    if(this.pos.x-this.r<0){
      this.pos.x=this.r;
      this.vel.x=-this.vel.x*ELASTICITY;
    }
    if(this.pos.x+this.r>800){
      this.pos.x=800-this.r;
      this.vel.x=-this.vel.x*ELASTICITY;
    }
    if(this.pos.y+this.r>640){
      this.pos.y=640-this.r;
      this.vel.y=-this.vel.y*ELASTICITY;
    }

  }
}

// canvas.addEventListener('keydown', (e)=>{

//   if(e.key==="a"){
//     console.log("A")
//     if(Balls.length>0){
//       Balls[0].acc=new Vector(0.1,0.1);
//     }
//   }
// });

canvas.addEventListener('click', (e)=>{
  leftClick=true;
  mouseX=e.clientX;
  mouseY=e.clientY;
});

function mouseControl(){
  if(leftClick===true){
    const rect = canvas.getBoundingClientRect();
    const x = mouseX - rect.left;
    const y = mouseY - rect.top;
    new Ball(x, y, RADIUS);
    leftClick=false;
  }
}

function round(number){
  return Math.round(number*PRECISION)/PRECISION;
}

function closestPointBW(b1, w1){
  let ballToWallStart = w1.start.sub(b1.pos);
  if(Vector.dot(w1.wallUnit(), ballToWallStart)>0){
    return w1.start;
  }

  let wallEndToBall = b1.pos.sub(w1.end);
  if(Vector.dot(w1.wallUnit(), wallEndToBall)>0){
    return w1.end;
  }

  let closestDist = Vector.dot(w1.wallUnit(), ballToWallStart);
  let closestVect = w1.wallUnit().mul(closestDist);
  return w1.start.sub(closestVect);
}

function coll_det_bb(b1, b2){
  if(b1.r + b2.r >= b2.pos.sub(b1.pos).mag()){
    return true;
  }else{
    return false;
  }
}

function pen_res_bb(b1, b2){
  let dist = b1.pos.sub(b2.pos);
  let pen_depth = b1.r + b2.r - dist.mag();
  let pen_res = dist.unit().mul(pen_depth/2);
  b1.pos = b1.pos.add(pen_res);
  b2.pos = b2.pos.add(pen_res.mul(-1));
  // b1.acc = b1.acc.add(pen_res.mul(0.8));
  // b2.acc = b2.acc.add(pen_res.mul(-1).mul(0.8));
}

function coll_res_bb(b1, b2){
  let normal = b1.pos.sub(b2.pos).unit();
  let relVel = b1.vel.sub(b2.vel);
  let sepVel = Vector.dot(relVel, normal);
  let new_sepVel = -sepVel*ELASTICITY;
  let sepVelVec = normal.mul(new_sepVel);

  b1.vel = b1.vel.add(sepVelVec);
  b2.vel = b2.vel.add(sepVelVec.mul(-1));
}

function coll_det_bw(b1, w1){
  let ballToClosest = closestPointBW(b1, w1).sub(b1.pos);
  if (ballToClosest.mag() <= b1.r){
    return true;
  }
}

function pen_res_bw(b1, w1){
  let penVect = b1.pos.sub(closestPointBW(b1, w1));
  b1.pos = b1.pos.add(penVect.unit().mul(b1.r-penVect.mag()));
}

function coll_res_bw(b1, w1){
  let normal = b1.pos.sub(closestPointBW(b1, w1)).unit();
  let sepVel = Vector.dot(b1.vel, normal);
  let new_sepVel = -sepVel*ELASTICITY;
  let vsep_diff = sepVel - new_sepVel;
  b1.vel = b1.vel.add(normal.mul(-vsep_diff));
}

function rotMx(angle){
  let mx = new Matrix(2,2);
  mx.data[0][0] = Math.cos(angle);
  mx.data[0][1] = -Math.sin(angle);
  mx.data[1][0] = Math.sin(angle);
  mx.data[1][1] = Math.cos(angle);
  return mx;
}

new Wall(400, 300, 700, 200);
new Wall(300, 400, 500, 600);

function update() {
  ctx.clearRect(0,0, canvas.clientWidth, canvas.clientHeight);

  mouseControl();
  Balls.forEach((ball, idx)=>{
    ball.move();
    for(let i=idx+1; i<Balls.length; ++i){
      if(coll_det_bb(ball,Balls[i])){
        pen_res_bb(ball,Balls[i]);
        coll_res_bb(ball,Balls[i]);
      }
    }
  })

  Balls.forEach((ball, idx)=>{
    Walls.forEach((wall)=>{
      if(coll_det_bw(ball, wall)){
        pen_res_bw(ball,wall);
        coll_res_bw(ball, wall);
      }
    })

    ball.constraint();
    ball.render();        
  })

  Walls.forEach((wall)=>{
    wall.render();

    // let rotMat = rotMx(0.3);
    // let newDir = rotMat.multiplyVec()
  })

  // closestPointBW(Ball1, Wall1,)

  requestAnimationFrame(update);
}

requestAnimationFrame(update);
