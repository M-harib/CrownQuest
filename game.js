const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const player = {
    x: 50, y: 550, width: 40, height: 40,
    color: 'cyan', speed: 5, dy: 0, gravity: 0.5, jumpPower: -10, onGround: false
};

let keys = {};
let platforms = [];
let coins = [];
let enemies = [];
let coinsCollected = 0;
let hitsTaken = 0;
let level = 1;
let gameState = "start";
let playerPerformance = { jumps:0, falls:0 };
let crownCollected = false;
let gameTime = 0; // for purple enemy speed scaling

let startClouds = [];
let startCoins = [];

// Generate clouds and coins for start screen
for(let i=0;i<5;i++){
    startClouds.push({x: Math.random()*canvas.width, y: Math.random()*100, width: 100, height: 60, dx: 0.3 + Math.random()*0.5});
}
for(let i=0;i<10;i++){
    startCoins.push({x: Math.random()*canvas.width, y: 300 + Math.random()*100, width: 20, height: 20, dy: 0.5 + Math.random()*0.5});
}


window.addEventListener('keydown', e => {
    console.log("Pressed key:", e.key, "GameState:", gameState);
    keys[e.key] = true;
    const key = e.key.toLowerCase();
    if(gameState==="start" && e.key==="Enter") startGame();
    if(gameState==="gameover" && e.key==="Enter") resetGame();
    if(gameState==="playing" && e.key==="g") giveUp();
});
window.addEventListener('keyup', e => keys[e.key] = false);
function giveUp(){ gameState="gameover"; }

// =========================
// Generate adaptive level
function generateAdaptiveLevel(){
    platforms = [];
    coins = [];
    enemies = [];
    
    // Randomly generate 6-8 platforms including ground
    const ground = {x:0, y:550, width:1000, height:20};
    platforms.push(ground);
    
    const numPlatforms = 6 + Math.floor(Math.random()*3); // 6-8
    for(let i=1;i<numPlatforms;i++){
        const y = 450 - i*50 + Math.random()*20; // staggered upwards
        const x = Math.random()*(canvas.width-150);
        platforms.push({x,y,width:150,height:20});
    }
    
    // Sort platforms by y ascending for crown placement
    platforms.sort((a,b)=>a.y-b.y);
    
    // Place coins randomly on platforms except highest
    platforms.slice(0,-1).forEach(p=>{
        if(Math.random()<0.7){ 
            const coinX = p.x + Math.random()*(p.width-20);
            coins.push({x:coinX, y:p.y-20, width:20, height:20, color:"yellow"});
        }
    });

    // Assign red enemies to random platforms (not highest)
    platforms.slice(0,-1).forEach(p=>{
        if(Math.random()<0.5){
            const speed = 1 + (550-p.y)/200 + level*0.2; // faster on higher platforms and higher level
            enemies.push({
                x: p.x + Math.random()*(p.width-30),
                y: p.y - 30,
                width: 30, height: 30,
                color: "red",
                dx: speed
            });
        }
    });

    // Add 2-4 falling purple enemies
    const numPurple = 1 + Math.floor(Math.random()*2);
    for(let i=0;i<numPurple;i++){
        enemies.push({
            x: Math.random()*(canvas.width-30),
            y: Math.random()*-300,
            width: 30, height: 30,
            color: "purple",
            dy: 0
        });
    }

    crownCollected = false;
}

// =========================
// Game Update
function update(){
    if(gameState!=="playing") return;

    gameTime += 0.016; // approximate seconds per frame

    // Player movement
    if(keys['ArrowLeft']) player.x -= player.speed;
    if(keys['ArrowRight']) player.x += player.speed;

    // Gravity & jump
    player.dy += player.gravity;
    player.y += player.dy;
    if(keys['ArrowUp'] && player.onGround){
        player.dy = player.jumpPower;
        player.onGround = false;
        playerPerformance.jumps++;
    }

    // Platform collision
    player.onGround=false;
    platforms.forEach(p=>{
        if(player.x < p.x+p.width && player.x+player.width>p.x &&
           player.y < p.y+p.height && player.y+player.height>p.y && player.dy>0){
            player.y = p.y - player.height;
            player.dy = 0;
            player.onGround = true;
        }
    });

    // Coins collection
    coins = coins.filter(c=>{
        if(player.x < c.x+c.width && player.x+player.width>c.x &&
           player.y < c.y+c.height && player.y+player.height>c.y){
            coinsCollected++;
            return false;
        }
        return true;
    });

    // Gradually spawn more purple enemies
    const maxPurple = 4; // maximum allowed
    if(enemies.filter(e=>e.color==="purple").length < maxPurple){
        // spawn one more roughly every 15 seconds
        if(Math.floor(gameTime) % 15 === 0 && Math.random() < 0.02){ 
            enemies.push({
                x: Math.random()*(canvas.width-30),
                y: Math.random()*-300,
                width: 30, height: 30,
                color: "purple",
                dy: 0
            });
        }
    }

    // Enemies
    enemies.forEach(e=>{
        if(e.color === "red"){ // patrol
            e.x += e.dx;
            let onPlatform = false;
            platforms.forEach(p=>{
                if(Math.abs(e.y + e.height - p.y) < 2){
                    onPlatform = true;
                    if(e.x <= p.x) e.dx = Math.abs(e.dx);
                    if(e.x + e.width >= p.x + p.width) e.dx = -Math.abs(e.dx);
                }
            });
            if(!onPlatform) e.y += 1;
        } else if(e.color === "purple"){ // falling
            const baseSpeed = 0.05;
            const adaptiveSpeed = baseSpeed + gameTime/5000; // start slow, gradually faster
            e.dy += adaptiveSpeed;
            e.y += e.dy;
            if(e.y > canvas.height){
                e.y = Math.random()*-300;
                e.dy = 0;
                e.x = Math.random()*(canvas.width - e.width);
            }
        }

        // Collision with player
        if(player.x<e.x+e.width && player.x+player.width>e.x &&
           player.y<e.y+e.height && player.y+player.height>e.y){
            hitsTaken++;
            resetPlayer();
        }
    });

    // Player falls
    if(player.y>canvas.height){
        hitsTaken++;
        resetPlayer();
    }

    // Crown collection (must land on highest platform)
    const highestY = Math.min(...platforms.map(p => p.y));
    const highestPlatform = platforms.find(p => p.y === highestY);

    // Check if player is standing on the highest platform
    if(player.onGround && player.y + player.height === highestPlatform.y &&
    player.x + player.width/2 > highestPlatform.x &&
    player.x + player.width/2 < highestPlatform.x + highestPlatform.width) {
        crownCollected = true;
        level++;  // increase level
        generateAdaptiveLevel();
        resetPlayer();
    }

}

// =========================
// Reset player
function resetPlayer(){
    player.x = 50;
    player.y = canvas.height-50;
    player.dy = 0;
    playerPerformance.falls++;
}

// =========================
// Draw
function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    if(gameState==="start"){
        // Move clouds
        startClouds.forEach(c => {
            c.x += c.dx;
            if(c.x > canvas.width) c.x = -c.width; // loop
            ctx.fillStyle = "rgba(255,255,255,0.8)";
            ctx.beginPath();
            ctx.ellipse(c.x, c.y, c.width/2, c.height/2, 0, 0, Math.PI*2);
            ctx.fill();
        });

        // Move coins up and down slightly (floating effect)
        startCoins.forEach(c => {
            c.y += Math.sin(Date.now()/500 + c.x) * 0.5; // oscillate
            ctx.fillStyle = "yellow";
            ctx.fillRect(c.x, c.y, c.width, c.height);
        });

        // Player floating
        const floatY = 420 + Math.sin(Date.now()/500)*10;
        ctx.fillStyle = player.color;
        ctx.fillRect(200, floatY, player.width, player.height);

        // Crown floating
        const crownX = 400;
        const crownY = 410 + Math.sin(Date.now()/500)*10;
        ctx.fillStyle = "gold";
        ctx.beginPath();
        ctx.moveTo(crownX-15, crownY+20);
        ctx.lineTo(crownX-10, crownY);
        ctx.lineTo(crownX-5, crownY+20);
        ctx.lineTo(crownX, crownY);
        ctx.lineTo(crownX+5, crownY+20);
        ctx.lineTo(crownX+10, crownY);
        ctx.lineTo(crownX+15, crownY+20);
        ctx.closePath();
        ctx.fill();


        ctx.fillStyle="white"; ctx.font="40px Arial";
        ctx.fillText("Infinite Adaptive Platformer", 100, 200);
        ctx.font="20px Arial";
        ctx.fillText("Press ENTER to Start", 350, 300);
        ctx.fillText("Press G to Give Up during game", 280, 350);
        return;
    }

    // Player
    ctx.fillStyle = player.color; 
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Platforms
    ctx.fillStyle='orange';
    platforms.forEach(p => ctx.fillRect(p.x,p.y,p.width,p.height));

    // Coins
    coins.forEach(c => { ctx.fillStyle=c.color; ctx.fillRect(c.x,c.y,c.width,c.height); });

    // Enemies
    enemies.forEach(e => { ctx.fillStyle=e.color; ctx.fillRect(e.x,e.y,e.width,e.height); });

    // Draw crown on highest platform
    const highestY = Math.min(...platforms.map(p=>p.y));
    const highestPlatform = platforms.find(p=>p.y===highestY);
    const crownX = highestPlatform.x + highestPlatform.width/2;
    const crownY = highestPlatform.y - 80;
    ctx.fillStyle="gold";
    ctx.beginPath();
    ctx.moveTo(crownX-15, crownY+20);
    ctx.lineTo(crownX-10, crownY);
    ctx.lineTo(crownX-5, crownY+20);
    ctx.lineTo(crownX, crownY);
    ctx.lineTo(crownX+5, crownY+20);
    ctx.lineTo(crownX+10, crownY);
    ctx.lineTo(crownX+15, crownY+20);
    ctx.closePath();
    ctx.fill();

    // HUD
    ctx.fillStyle="white"; ctx.font="18px Arial";
    ctx.fillText(`Score: ${Math.max(0, coinsCollected-hitsTaken)}`,10,25);
    ctx.fillText(`Coins: ${coinsCollected}`,10,50);
    ctx.fillText(`Hits: ${hitsTaken}`,10,75);
    ctx.fillText(`Level: ${level}`,10,100);
}

// =========================
// Start / Reset
function startGame(){
    gameState="playing";
    coinsCollected=0;
    hitsTaken=0;
    level=1;
    gameTime=0;
    player.x = 50;
    player.y = canvas.height-50;
    player.dy = 0;
    generateAdaptiveLevel();
}

function resetGame(){
    gameState="start";
    coinsCollected=0;
    hitsTaken=0;
    playerPerformance.jumps=0;
    playerPerformance.falls=0;
    crownCollected=false;
    level=1;
    gameTime=0;
}

// =========================
// Game Loop
function gameLoop(){ 
    update(); 
    draw(); 
    requestAnimationFrame(gameLoop); 
}
gameLoop();
