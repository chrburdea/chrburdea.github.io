var ID = 0;


const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");
var refreshIntervall = null
var refreshIntervallSpeed = 100;
const canvasWidth = 400;
const canvasHeight = 400;

var populationList = [];
var populationSize = document.getElementById("populationRangeSlider").value;
var running = false;

const speedlimit = 2;

const elementWidth = 30;
const elementHeight = 30;

const G = 10.0; //Gravitational constant
const mass = 100;

const collision = false;

var qT = null;
const qTCapacity = 1;

function drawPopulation(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    qT.draw();
    populationList.forEach(element => {
        let obj = null;
        switch(element.type){
            case 0: obj = "🪨";  break; 
            case 1: obj = "📰";  break;
            case 2: obj = "✂️"; break;
        }
        ctx.font = "20px Impact";
        ctx.fillText(obj, element.x + (elementWidth/2) - 11, element.y + (elementHeight/2) + 7);
    });
    
    
    
}

function createPopulationObjects(size){
    for(var i = 0; i < size; i++){

        // Generate a random value between -1 and 1 for the first number
        let num1 = (Math.random() * 2) - 1;

        // Calculate the range for the second number based on the absolute value of num1
        let rangeForNum2 = 1 - Math.abs(num1);

        // Generate a random value within the calculated range for the second number
        let num2 = (Math.random() * 2 * rangeForNum2) - rangeForNum2;

        populationList.push({
            type: Math.floor(Math.random() * 3),
            x: Math.floor(Math.random() * (canvasWidth - elementWidth)),
            y: Math.floor(Math.random() * (canvasHeight - elementHeight)),
            mass: mass, //TODO: check, if mass is really needed
            vx: 0,
            vy: 0
        });
    };
}

function start(){
    if (refreshIntervall != null) clearInterval(refreshIntervall);
    refreshIntervall = setInterval(function(){
        if (!determineEndOfGame()){
            updatePositionsOfPopulation();
            updateTrajectoriesWithinPopulation();
            battleRound();
            drawPopulation();
        } else {
            ctx.fillStyle = "rgb(255, 255, 255)";
            ctx.font = "60px Impact";
            ctx.fillText("GAME OVER", 63, 224);
        }
        
    }, refreshIntervallSpeed);
}

function reset(){
    if (refreshIntervall != null) clearInterval(refreshIntervall);
    populationList = [];
    createPopulationObjects(populationSize);
    updatePositionsOfPopulation();
    drawPopulation();
}

function countTypes(){
    let t0 = 0;
    let t1 = 0;
    let t2 = 0;

    populationList.forEach(elem => {
        if (elem.type == 0) { t0 += 1}
        if (elem.type == 1) { t1 += 1}
        if (elem.type == 2) { t2 += 1}
    });

    return [t0,t1,t2];
}

function determineEndOfGame(){
    let arr = countTypes();
    let count = 0;
    arr.forEach(elem => {
        if (elem == 0) {count += 1}
    })
    if (count > 1) {
        clearInterval(refreshIntervall);       
        return true;
    }
    return false;
}

// function updates the trajectory of each element
function updatePositionsOfPopulation(){
    ID = 0;
    qT = new QuadTree(0,0,canvasHeight,canvasWidth,qTCapacity);    

    populationList.forEach(element => {
        qT.insert(element);
        element.x = element.x + element.vx;
        element.y = element.y + element.vy;
    });
    resetPositionAfterWindowExit();
}

function updateTrajectoriesWithinPopulation(){
        for(let elem of populationList){
            let found = [];
            let searchFactor = 0.1; 
            
            //Return elements close to the point
            while(found.length == 0){
                if(searchFactor > 1000){
                    break;
                }
                searchFactor += 0.1;
                let rangeHeight = canvasHeight * searchFactor;
                let rangeWidth = canvasWidth * searchFactor;
                let nearestElements = qT.query(elem.x - rangeWidth,elem.y - rangeHeight,rangeWidth * 2, rangeHeight * 2);

                //only add elements that are not of the same type
                nearestElements.forEach(elem2 => {
                    if(elem2.type != elem.type){
                        found.push(elem2);
                    }
                });
            }
            //console.log("found size2: ", found.length, found);
                        
            //get closest elements for each element
            let distanceByElement = [];
            found.forEach(elem2 => {
                distanceByElement.push([calculateDistance(elem, elem2)  ,elem2]);
            });

            let sortedDistanceByElement = sort2DArray(distanceByElement);
            
            //Apply gravity only to the nearest element
            applyGravity(elem, sortedDistanceByElement[0][1]);
    }
}

function sort2DArray(arr) {
    // Use the sort function with a custom comparator
    arr.sort(function(a, b) {
        // Compare the first column values
        return a[0] - b[0];
    });
    
    return arr;
  }

function resetPositionAfterWindowExit(){
    populationList.forEach(elem =>{
        if(elem.x > canvasWidth){
            elem.x = 0;
        }
        if(elem.x < 0){
            elem.x = canvasWidth;
        }

        if(elem.y > canvasHeight){
            elem.y = 0;
        }

        if(elem.y < 0){
            elem.y = canvasHeight;
        }
    });
}

function updatePopulation(){
    ID = 0;
    qT = new QuadTree(0,0,canvasHeight,canvasWidth,qTCapacity);
    populationList.forEach(element => {
        qT.insert(element)
    });
}
//TODO
function detectOverlap(x1,y1,w1,h1,x2,y2,w2,h2){
    
    rectA = {};
    rectB = {};

    rectA.x1 = x1;
    rectA.y1 = y1;
    rectA.x2 = x1 + w1;
    rectA.y2 = y1 + h1;

    rectB.x1 = x2
    rectB.y1 = y2
    rectB.x2 = x2 + w2;
    rectB.y2 = y2 + h2;

    var overlaps = 
        (rectA.X1 < rectB.X2 && 
        rectA.X2 > rectB.X1 &&
        rectA.Y1 > rectB.Y2 && 
        rectA.Y2 < rectB.Y1);

    return !overlaps
}

function battleRound(){

    for(let elem of populationList){
        //Return elements close to the point
        rangeHeight = canvasHeight * 0.1;
        rangeWidth = canvasWidth * 0.1;
        let found = qT.query(elem.x - rangeWidth,elem.y - rangeHeight,rangeWidth * 2, rangeHeight * 2);

        //Check which ones collide with the given element
        for(let opp of found){
            let types = [];
            types.push(elem.type);
            types.push(opp.type);
            
            //check if elements actually collide
            if(containsWithElement(opp, elem.x-20, elem.y-20, 40, 40)){
                //change element
                if(types.includes(0) && types.includes(1)){ // rock vs paper
                    elem.type = 1;
                    opp.type = 1;
                    collisionReset(elem, opp);
                } else if (types.includes(0) && types.includes(2)) { //rock vs scissor
                    elem.type = 0;
                    opp.type = 0;
                    collisionReset(elem, opp);
                } else if (types.includes(1) && types.includes(2)){ // paper vs scissor
                    elem.type = 2;
                    opp.type = 2;
                    collisionReset(elem, opp);
                }
            }
        }
    }
    updatePopulation();
}

function collisionReset(elem, opp) {
    if (collision) {
        elem.vx = 0;
        elem.vy = 0;
        opp.vx = 0;
        opp.vy = 0;
    }
}

//TODO Contains Methode macht faxen
function containsWithElement(elem,x2,y2,w2,h2){
    return (
        elem.x >= x2 &&
        elem.x < x2 + w2 &&
        elem.y >= y2 &&
        elem.y < y2 + h2
    );
} 

function calculateDistance(element1, element2){
    let dx = element2.x - element1.x;
    let dy = element2.y - element1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Function to apply gravitational attraction between two objects
function applyGravity(element1, element2) {
    const distance = calculateDistance(element1, element2);

    // Prevent division by zero
    if (distance === 0) return;

    const force = (G * element1.mass * element2.mass) / (distance * distance);
    const angle = Math.atan2(element2.y - element1.y, element2.x - element1.x);

    // Apply forces to objects
    element1.vx += Math.cos(angle) * force / element1.mass;
    element1.vy += Math.sin(angle) * force / element1.mass;

    element2.vx -= Math.cos(angle) * force / element2.mass;
    element2.vy -= Math.sin(angle) * force / element2.mass;


    if (element1.vx > speedlimit) {element1.vx = speedlimit}
    if (element1.vy > speedlimit) {element1.vy = speedlimit}
    if (element1.vx < -speedlimit) {element1.vx = -speedlimit}
    if (element1.vy < -speedlimit) {element1.vy = -speedlimit}

    
    if (element2.vx > speedlimit) {element2.vx = speedlimit}
    if (element2.vy > speedlimit) {element2.vy = speedlimit}    
    if (element2.vx < -speedlimit) {element2.vx = -speedlimit}
    if (element2.vy < -speedlimit) {element2.vy = -speedlimit}
}

//TODO
class QuadTree {
    constructor(x,y, width, height, capacity){
        this.id = ID;
        ctx.rect(x,y,width, height);
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.capacity = capacity;
        this.points = [];
        this.subdivided = false;
        ID = ID + 1;
    }

    subdivide(){
        this.subdivided = true;
        this.northwest = new QuadTree(this.x, this.y, this.width / 2, this.height / 2, this.capacity);
        this.northeast = new QuadTree(this.x + this.width / 2, this.y, this.width / 2, this.height / 2, this.capacity);
        this.southwest = new QuadTree(this.x, this.y + this.width/2, this.width / 2, this.height / 2, this.capacity);
        this.southeast = new QuadTree(this.x + this.width / 2, this.y + this.width/2, this.width / 2, this.height / 2, this.capacity);
    }

    isWithinTree(element){
        return (
            element.x >= this.x &&
            element.x < this.x + this.width &&
            element.y >= this.y &&
            element.y < this.y + this.height
        );
    }

    insert(element){
        
        // console.log("isWithinTree: ", this.id, this.isWithinTree(element));
        // If the element is not within boundaries, refuse insertion
        if (!this.isWithinTree(element)){
            return;
        }

        //if qT has capacity insert it
        if (this.points.length < this.capacity) { 
            this.points.push(element);
            // console.log("Inserted at: ", this.id);
            return true;
        } else {
            //if no capacity, create more trees and insert there
            if (!this.subdivided){
                this.subdivide();
            }
            if (this.northwest.insert(element)) return true;
            if (this.northeast.insert(element)) return true;
            if (this.southwest.insert(element)) return true;
            if (this.southeast.insert(element)) return true;
        }
    }

    query(x,y,w,h){
        let found = [];
        if (!detectOverlap(x,y,w,h,this.x,this.y,this.width,this.width)){
            // console.log("no elements within searching range");
            return found;
        } else {
            for (let elem of this.points){
                if (containsWithElement(elem,x,y,w,h)){
                    found.push(elem);
                }
            }
             if (this.subdivided){
                found = found.concat(this.northwest.query(x,y,w,h));
                found = found.concat(this.northeast.query(x,y,w,h));
                found = found.concat(this.southwest.query(x,y,w,h));
                found = found.concat(this.southeast.query(x,y,w,h));
            } 
            return found;
        }
    }

    draw(){
        if(this.subdivided){
            this.northwest.draw();
            this.northeast.draw();
            this.southwest.draw();
            this.southeast.draw();
        } else {
            
            // ctx.fillStyle = "rgb(255, 255, 255)";
            // ctx.font = "10px serif";
            // ctx.fillText(this.id, this.x + (this.width / 2) - 5, this.y + (this.height / 2));

            ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
            ctx.strokeRect(this.x , this.y, this.width, this.height);
            
        }
    }
}

/* Frontend Controls */

var slider = document.getElementById("populationRangeSlider");
var output = document.getElementById("populationSize");
output.innerHTML = slider.value; // Display the default slider value

// Update the current slider value (each time you drag the slider handle)
slider.oninput = function() {
  output.innerHTML = this.value;
  populationSize = this.value;
  reset();
};

function addOnClick(e){
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>insert");
    populationList.push({
        type: Math.floor(Math.random() * 3),
        x: e.pageX -20,
        y: e.pageY -20,
        mass: mass,
        vx: 0,
        vy: 0
    });
    updatePopulation();
    drawPopulation();
}

document.getElementById("reset").onclick = reset;
document.getElementById("start").onclick = start;
canvas.addEventListener("click", addOnClick, false);

reset();
//TODO: Only apply gravity if types are different
