
var bridgeCost = 2;
var tunnelCost = 2;
var policeCost = 5;
var parkCost = 5;
var portCost = 5;
var airportCost = 5;

var game;

var politicsActive = false;
var politicsPlan = new Set();
var buildButton = document.getElementById("build");
var politicsButton = document.getElementById("politics");
var politicsButton1 = document.getElementById("politics1");
var politicsButton2 = document.getElementById("politics2");
var passButton = document.getElementById("pass");
var politicsText = document.getElementById("politicsText");
var politicsText1 = document.getElementById("politicsText1");
var politicsText2 = document.getElementById("politicsText2");
var helpText = document.getElementById("helpText");
var hexagonGrid = null;

politicsButton.disabled = true;
passButton.disabled = true;

function log(msg) {
    setTimeout(function() {
        throw new Error(msg);
    }, 0);
};

start = function() {
    if (politicsActive) {
	togglePolitics();
    }

    game = new Game(2);
    if (hexagonGrid == null) {
	hexagonGrid = new HexagonGrid("HexCanvas", 30);
    }
    hexagonGrid.initialize(7, 10, 5, 5, false);
}

build = function() {
    var player = game.getCurrentPlayer();
    var plan = player.plan;
    var it = plan[Symbol.iterator]();    
    if (plan.size == 1) {
	var hex = it.next().value;
	if (hex.type == Hex.Type.COMMERCE) {
	    hex.crime = comCrime[player.comHouses];
	    if (bfs(hex, "Airport") == -1) hex.crime++;
	    player.money -= game.comPrice;
	    player.comHouses--;
	    if (game.comPrice < 12) game.comPrice++;
	    if (game.indPrice > 4) game.indPrice--;
	    if (game.resPrice > 4) game.resPrice--;
	}
	if (hex.type == Hex.Type.INDUSTRY) {
	    hex.crime = indCrime[player.indHouses];
	    if (bfs(hex, "Port") == -1) hex.crime++;
	    player.money -= game.indPrice;
	    player.indHouses--;
	    if (game.indPrice < 12) game.indPrice++;
	    if (game.comPrice > 4) game.comPrice--;
	    if (game.resPrice > 4) game.resPrice--;
	}
	if (hex.type == Hex.Type.RESIDENCE) {
	    hex.crime = resCrime[player.resHouses] + 1;
	    player.money -= game.resPrice;
	    player.resHouses--;
	    if (game.resPrice < 12) game.resPrice++;
	    if (game.indPrice > 4) game.indPrice--;
	    if (game.comPrice > 4) game.comPrice--;
	}
	plan.clear();
	hex.building = Hex.Building.HOUSE;
	hex.refresh();
	game.endTurn();
    }
    if (plan.size == 2) {
	var hex1 = it.next().value;
	var hex2 = it.next().value;
	var res = false;
	var com = false;
	var ind = false;
	if (hex1.type == Hex.Type.COMMERCE || hex2.type == Hex.Type.COMMERCE) {
	    if (hex1.type == Hex.Type.COMMERCE)
		hex1.crime = comCrime[player.comHouses];
	    else
		hex2.crime = comCrime[player.comHouses];
	    player.money -= game.comPrice;
	    player.comHouses--;
	    if (game.comPrice < 12) game.comPrice++;
	    com = true;
	}
	if (hex1.type == Hex.Type.INDUSTRY || hex2.type == Hex.Type.INDUSTRY) {
	    if (hex1.type == Hex.Type.INDUSTRY)
		hex1.crime = indCrime[player.indHouses];
	    else
		hex2.crime = indCrime[player.indHouses];
	    player.money -= game.indPrice;
	    player.indHouses--;
	    if (game.indPrice < 12) game.indPrice++;
	    ind = true;
	}
	if (hex1.type == Hex.Type.RESIDENCE || hex2.type == Hex.Type.RESIDENCE) {
	    if (hex1.type == Hex.Type.RESIDENCE)
		hex1.crime = resCrime[player.resHouses];
	    else
		hex2.crime = resCrime[player.resHouses];
	    player.money -= game.resPrice;
	    player.resHouses--;
	    if (game.resPrice < 12) game.resPrice++;
	    res = true;
	}
	if (!res && game.resPrice > 4) game.resPrice--;
	if (!com && game.comPrice > 4) game.comPrice--;
	if (!ind && game.indPrice > 4) game.indPrice--;
	plan.clear();
	hex1.building = Hex.Building.HOUSE;
	hex2.building = Hex.Building.HOUSE;
	hex1.refresh();
	hex2.refresh();
	game.endTurn();
    }
    buildButton.disabled = true;
}

pass = function() {
    if (politicsActive) {
	togglePolitics();
    }
    game.pass();
}

togglePolitics = function() {
    if (politicsActive) {
	politicsButton1.hidden = true;
	politicsButton2.hidden = true;
	politicsPlan.forEach(function(hex) {
	    hex.refresh();
	});
    }
    politicsPlan.clear();
    politicsActive = !politicsActive;
    if (politicsActive) {
	politicsButton.style.backgroundColor = "#f66";
    } else {
	politicsButton.style.backgroundColor = null;
    }
}

politics1 = function() {
    executePolitics(politicsText1.innerHTML);
}

politics2 = function() {
    executePolitics(politicsText2.innerHTML);
}

executePolitics = function(type) {
    var it = politicsPlan[Symbol.iterator]();
    var player = game.getCurrentPlayer();
    switch (type) {
    case "Police":
	var hex = it.next().value;
	player.money -= policeCost;
	game.policeCount--;
	hex.building = Hex.Building.POLICE;
	hex.type = Hex.Type.LAND;
	hex.refresh();
	break;
    case "Park":
	var hex = it.next().value;
	player.money -= parkCost;
	game.parkCount--;
	hex.building = Hex.Building.PARK;
	hex.type = Hex.Type.LAND;
	hex.refresh();
	break;
    case "Bridge":
    case "Tunnel":
	player.money -= bridgeCost;
	var l = new Array();
	l.push(it.next().value);
	l.push(it.next().value);
	l.sort(sorter);
	hexagonGrid.drawBridge(l[0], l[1]);
	hexagonGrid.bridges.push(l);
	l[0].refresh();
	l[1].refresh();
	break;
    case "Port":
	player.money -= portCost;
	game.portCount--;
	var l = new Array();
	l.push(it.next().value);
	l.push(it.next().value);
	l.sort(sorter);
	l[0].building = Hex.Building.PORT;
	l[1].building = Hex.Building.PORT;
	l[0].type = Hex.Type.LAND;
	l[1].type = Hex.Type.LAND;
	l[0].refresh();
	l[1].refresh();
	hexagonGrid.drawPort(l[0], l[1]);
	break;
    case "Airport":
	player.money -= airportCost;
	game.airportCount--;
	var l = new Array();
	l.push(it.next().value);
	l.push(it.next().value);
	l.push(it.next().value);
	l.sort(sorter);
	l[0].building = Hex.Building.AIRPORT;
	l[1].building = Hex.Building.AIRPORT;
	l[2].building = Hex.Building.AIRPORT;
	l[0].type = Hex.Type.LAND;
	l[1].type = Hex.Type.LAND;
	l[2].type = Hex.Type.LAND;
	l[0].refresh();
	l[1].refresh();
	l[2].refresh();
	hexagonGrid.drawAirport(l[0], l[1], l[2]);
	break;
    }
    politicsPlan.clear();
    togglePolitics();
    game.endTurn();
}

//=============================================================== Hexagon Grid

function HexagonGrid(canvasId, radius) {
    this.radius = radius;

    this.height = Math.sqrt(3) * radius;
    this.width = 2 * radius;
    this.side = (3 / 2) * radius;

    this.canvas = document.getElementById(canvasId);
    this.context = this.canvas.getContext('2d');

    this.canvasOriginX = 0;
    this.canvasOriginY = 0;

    this.rowCount = 0;
    this.colCount = 0;

    this.columns = new Array();
    this.bridges = new Array();

    this.canvas.addEventListener(
	"mousedown", this.clickEvent.bind(this), false);
};

HexagonGrid.prototype.initialize =
    function(rows, cols, originX, originY, isDebug) {
    this.canvasOriginX = originX;
    this.canvasOriginY = originY;

    this.rowCount = rows;
    this.colCount = cols;

    var debugText = "";

    for (var col = 0; col < cols; col++) {
	var column = new Array();
        for (var row = 0; row < rows; row++) {
            if (isDebug) {
                debugText = col + "," + row;
            }
	    var rand = Math.floor(Math.random() * 6);
	    var hex = new Hex(this, col, row, rand, debugText);
	    column[row] = hex;
        }
	this.columns[col] = column;
    }

    this.refresh();

    buildButton.disabled = true;
    politicsButton.disabled = false;
    passButton.disabled = false;
};

HexagonGrid.prototype.refresh = function() {
    for (var col = 0; col < this.colCount; col++) {
	for (var row = 0; row < this.rowCount; row++) {
	    this.columns[col][row].refresh();
	}
    }
};

HexagonGrid.prototype.getX = function(column) {
    var drawx = (column * this.side) + this.canvasOriginX;
    return drawx;
};

HexagonGrid.prototype.getY = function(column, row) {
    var drawy = column % 2 == 0 ? (row * this.height) + this.canvasOriginY :
	(row * this.height) + this.canvasOriginY + (this.height / 2);
    return drawy;
};

HexagonGrid.prototype.drawHexAtColRow =
    function(column, row, color, debugText) {
    this.drawHex(this.getX(column), this.getY(column, row), color, debugText);
};

HexagonGrid.prototype.drawCircle = function(x0, y0, fillColor) {
    this.context.strokeStyle = "#000";
    this.context.beginPath();
    this.context.arc(x0 + this.width / 2, y0 + this.height / 2,
		     this.radius / 3, 0, 2 * Math.PI);
    this.context.stroke();
    this.context.fillStyle = fillColor;
    this.context.fill();
};

HexagonGrid.prototype.drawHouse = function(x0, y0, fillColor) {
    this.context.strokeStyle = "#000";
    this.context.beginPath();
    this.context.moveTo(x0 + this.width / 2, y0 + this.height / 6);
    this.context.lineTo(x0 + this.width * 2 / 3, y0 + this.height / 3);
    this.context.lineTo(x0 + this.width * 2 / 3, y0 + this.height * 7 / 12);
    this.context.lineTo(x0 + this.width * 1 / 3, y0 + this.height * 7 / 12);
    this.context.lineTo(x0 + this.width * 1 / 3, y0 + this.height / 3);

    if (fillColor) {
        this.context.fillStyle = fillColor;
        this.context.fill();
    }

    this.context.closePath();
    this.context.stroke();
};

HexagonGrid.prototype.drawBridge = function(a, b) {
    var xA = a.row == b.row ? this.width : this.side;
    var yA = a.row == b.row ? (this.height / 2) :
	(a.row < b.row ? this.height : 0);
    var xB = this.width - xA;
    var yB = this.height - yA;

    var xA0 = this.getX(a.col);
    var yA0 = this.getY(a.col, a.row);
    var xB0 = this.getX(b.col);
    var yB0 = this.getY(b.col, b.row);

    this.context.strokeStyle = "#ccc";
    this.context.beginPath();

    this.context.moveTo(xA0 + xA, yA0 + yA);
    this.context.lineTo(xB0 + xB, yB0 + yB);
    this.context.lineWidth = this.radius / 5;
    this.context.stroke();
    this.context.lineWidth = 1;
};

HexagonGrid.prototype.drawPark = function(x0, y0) {
    this.context.strokeStyle = "830";
    this.context.beginPath();
    this.context.moveTo(x0 + this.width * 5 / 12, y0 + this.height * 7 / 12);
    this.context.lineTo(x0 + this.width * 5 / 12, y0 + this.height * 5 / 6);
    this.context.lineTo(x0 + this.width * 7 / 12, y0 + this.height * 5 / 6);
    this.context.lineTo(x0 + this.width * 7 / 12, y0 + this.height * 7 / 12);
    this.context.fillStyle = "#941";
    this.context.fill();
    this.context.closePath();
    this.context.stroke();

    this.context.strokeStyle = "#0b0";
    this.context.beginPath();
    this.context.arc(x0 + this.width / 2, y0 + this.height / 3,
		     this.height / 4, 0, 2 * Math.PI);
    this.context.stroke();
    this.context.fillStyle = "#0d0";
    this.context.fill();
};

HexagonGrid.prototype.drawPort = function(a, b) {
    this.context.strokeStyle = "#000";
    this.context.lineWidth = this.radius / 10;
    this.drawPortAt(this.getX(a.col), this.getY(a.col, a.row));
    this.drawPortAt(this.getX(b.col), this.getY(b.col, b.row));
    this.context.lineWidth = 1;
};

HexagonGrid.prototype.drawPortAt = function(x0, y0) {
    this.context.beginPath();
    this.context.arc(x0 + this.width / 2, y0 + this.height / 3,
		     this.height / 2, Math.PI / 4, 3 * Math.PI / 4);
    this.context.moveTo(x0 + this.width / 2, y0 + this.height * 5 / 6);
    this.context.lineTo(x0 + this.width / 2, y0 + this.height / 6);
    this.context.moveTo(x0 + this.width / 3, y0 + this.height / 3);
    this.context.lineTo(x0 + this.width * 2 / 3, y0 + this.height / 3);
    this.context.stroke();
}

HexagonGrid.prototype.drawAirport = function(a, b, c) {
    this.context.strokeStyle = "#000";
    this.context.beginPath();
    var x0 = this.getX(a.col);
    var x1 = this.getX(c.col);
    var y0 = this.getY(a.col, a.row);
    var y1 = this.getY(c.col, c.row);
    this.context.lineWidth = this.radius / 2;
    this.context.moveTo(x0 + this.width / 2, y0 + this.height / 2);
    this.context.lineTo(x1 + this.width / 2, y1 + this.height / 2);
    this.context.stroke();

    this.context.strokeStyle = "#fff";
    this.context.lineWidth = this.radius / 10;
    this.drawRunwayLane(x0, y0, x1 - x0, y1 - y0, 1);
    this.drawRunwayLane(x0, y0, x1 - x0, y1 - y0, 3);
    this.drawRunwayLane(x0, y0, x1 - x0, y1 - y0, 5);
    this.drawRunwayLane(x0, y0, x1 - x0, y1 - y0, 7);
    this.context.lineWidth = 1;
};

HexagonGrid.prototype.drawRunwayLane = function(x0, y0, dx, dy, i) {
    this.context.beginPath();
    this.context.moveTo(x0 + this.width / 2 + dx * i / 9,
			y0 + this.height / 2 + dy * i / 9);
    this.context.lineTo(x0 + this.width / 2 + dx * (i + 1) / 9,
			y0 + this.height / 2 + dy * (i + 1) / 9);
    this.context.stroke();
}

var crimeLocs4 = [-3/12, -1/12, 1/12, 3/12];
var crimeLocs3 = [-2/12, 0, 2/12];
var crimeLocs2 = [-1/12, 1/12];
var crimeLocs1 = [0];
var crimeLocs = [crimeLocs1, crimeLocs2, crimeLocs3, crimeLocs4];

HexagonGrid.prototype.drawCrime = function(x0, y0, crime) {
    this.context.strokeStyle = "#000";
    var locs = crimeLocs[crime - 1];
    for (var i = 0; i < locs.length; i++) {
	this.context.beginPath();
	this.context.arc(x0 + this.width / 2 + locs[i] * this.width, y0 + this.height * 5 / 6,
			 this.width / 24, 0, 2 * Math.PI);
	this.context.fillStyle = "#941";
	this.context.fill();
	this.context.stroke();
    }
}

HexagonGrid.prototype.drawHex = function(x0, y0, fillColor, debugText) {
    this.context.strokeStyle = "#000";
    this.context.beginPath();
    this.context.moveTo(x0 + this.width - this.side, y0);
    this.context.lineTo(x0 + this.side, y0);
    this.context.lineTo(x0 + this.width, y0 + (this.height / 2));
    this.context.lineTo(x0 + this.side, y0 + this.height);
    this.context.lineTo(x0 + this.width - this.side, y0 + this.height);
    this.context.lineTo(x0, y0 + (this.height / 2));

    if (fillColor) {
        this.context.fillStyle = fillColor;
        this.context.fill();
    }

    this.context.closePath();
    this.context.stroke();

    if (debugText) {
        this.context.font = "8px";
        this.context.fillStyle = "#000";
        this.context.fillText(debugText, x0 + (this.width / 2) -
			      (this.width/4), y0 + (this.height - 5));
    }
};

HexagonGrid.prototype.drawInnerHex = function(x0, y0, fillColor) {
    this.context.strokeStyle = fillColor;
    this.context.beginPath();
    this.context.arc(x0 + this.width / 2, y0 + this.height / 2,
		     this.radius * 2 / 3, 0, 2 * Math.PI);
/*
    this.context.moveTo(x0 + this.width * 7 / 6 - this.side, y0 + this.height / 6);
    this.context.lineTo(x0 + this.side - this.width / 6, y0 + this.height / 6);
    this.context.lineTo(x0 + this.width * 5 / 6, y0 + (this.height / 2));
    this.context.lineTo(x0 + this.side - this.width / 6, y0 + this.height * 5 / 6);
    this.context.lineTo(x0 + this.width * 7 / 6 - this.side, y0 + this.height * 5 / 6);
    this.context.lineTo(x0 + this.width / 6, y0 + (this.height / 2));
*/
    this.context.fillStyle = fillColor;
    this.context.fill();

    this.context.closePath();
    this.context.stroke();
}

//Recusivly step up to the body to calculate canvas offset.
HexagonGrid.prototype.getRelativeCanvasOffset = function() {
    var x = 0, y = 0;
    var layoutElement = this.canvas;
    if (layoutElement.offsetParent) {
        do {
            x += layoutElement.offsetLeft;
            y += layoutElement.offsetTop;
        } while (layoutElement = layoutElement.offsetParent);
        
        return { x: x, y: y };
    }
}

//Uses a grid overlay algorithm to determine hexagon location
//Left edge of grid has a test to acuratly determin correct hex
HexagonGrid.prototype.getSelectedTile = function(mouseX, mouseY) {

    var offSet = this.getRelativeCanvasOffset();

    mouseX -= offSet.x;
    mouseY -= offSet.y;

    var column = Math.floor((mouseX) / this.side);
    var row = Math.floor(
        column % 2 == 0
            ? Math.floor((mouseY) / this.height)
            : Math.floor(((mouseY + (this.height * 0.5)) / this.height)) - 1);


    //Test if on left side of frame            
    if (mouseX > (column * this.side) &&
	mouseX < (column * this.side) + this.width - this.side) {


        //Now test which of the two triangles we are in 
        //Top left triangle points
        var p1 = new Object();
        p1.x = column * this.side;
        p1.y = column % 2 == 0
            ? row * this.height
            : (row * this.height) + (this.height / 2);

        var p2 = new Object();
        p2.x = p1.x;
        p2.y = p1.y + (this.height / 2);

        var p3 = new Object();
        p3.x = p1.x + this.width - this.side;
        p3.y = p1.y;

        var mousePoint = new Object();
        mousePoint.x = mouseX;
        mousePoint.y = mouseY;

        if (this.isPointInTriangle(mousePoint, p1, p2, p3)) {
            column--;

            if (column % 2 != 0) {
                row--;
            }
        }

        //Bottom left triangle points
        var p4 = new Object();
        p4 = p2;

        var p5 = new Object();
        p5.x = p4.x;
        p5.y = p4.y + (this.height / 2);

        var p6 = new Object();
        p6.x = p5.x + (this.width - this.side);
        p6.y = p5.y;

        if (this.isPointInTriangle(mousePoint, p4, p5, p6)) {
            column--;

            if (column % 2 == 0) {
                row++;
            }
        }
    }

    return  { row: row, column: column };
};


HexagonGrid.prototype.sign = function(p1, p2, p3) {
    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
};

HexagonGrid.prototype.isPointInTriangle =
    function isPointInTriangle(pt, v1, v2, v3) {
    var b1, b2, b3;

    b1 = this.sign(pt, v1, v2) < 0.0;
    b2 = this.sign(pt, v2, v3) < 0.0;
    b3 = this.sign(pt, v3, v1) < 0.0;

    return ((b1 == b2) && (b2 == b3));
};

HexagonGrid.prototype.clickEvent = function(e) {
    var mouseX = e.pageX;
    var mouseY = e.pageY;

    var localX = mouseX - this.canvasOriginX;
    var localY = mouseY - this.canvasOriginY;

    var tile = this.getSelectedTile(localX, localY);
    if (tile.column >= 0 && tile.row >= 0 &&
	tile.column < this.colCount && tile.row < this.rowCount) {
	var hex = this.columns[tile.column][tile.row];
	var player = game.getCurrentPlayer();
	hex.click(player);
	if (player.paid.size != 0 || player.plan.size != 0) {
	    politicsButton.disabled = true;
	    passButton.disabled = true;
	} else {
	    politicsButton.disabled = false;
	    passButton.disabled = false;
	}
    }
};

//=================================================================== Hexagons

Hex.Type = {
    WATER : 0,
    LAND : 1,
    MOUNTAIN : 2,
    RESIDENCE : 3,
    COMMERCE : 4,
    INDUSTRY : 5
}

Hex.Building = {
    EMPTY : 0,
    DISC : 1,
    HOUSE : 2,
    POLICE : 3,
    PARK : 4,
    PORT : 5,
    AIRPORT : 6
}

function Hex(grid, col, row, type, text) {
    this.grid = grid;
    this.col = col;
    this.row = row;
    this.type = type;
    this.owner = null;
    this.crime = 0;
    this.building = Hex.Building.EMPTY;
    this.text = text;
};

Hex.prototype.draw = function(color) {
    this.grid.drawHexAtColRow(this.col, this.row, color, this.text);
    var color = null;
    switch (this.type) {
    case Hex.Type.RESIDENCE: color = "#5d5"; break;
    case Hex.Type.COMMERCE:  color = "#bbf"; break;
    case Hex.Type.INDUSTRY:  color = "#ff8"; break;
    default: 
	break;
    }
    if (color != null) {
	this.grid.drawInnerHex(this.grid.getX(this.col),
			       this.grid.getY(this.col, this.row), color);
    }
    if (this.building == Hex.Building.EMPTY) return;
    color = "#ccc";
    if (this.owner != null) {
	color = this.owner.color;
    }
    var x = this.grid.getX(this.col);
    var y = this.grid.getY(this.col, this.row);
    switch (this.building) {
    case Hex.Building.DISC:
	this.grid.drawCircle(x, y, color);
	break;
    case Hex.Building.POLICE:
    case Hex.Building.HOUSE:
	this.grid.drawHouse(x, y, color);
	break;
    case Hex.Building.PARK:
	this.grid.drawPark(x, y);
	break;
    default:
	break;
    }
    if (this.crime > 0) {
	this.grid.drawCrime(x, y, this.crime);
    }
};

Hex.prototype.refresh = function() {
    var color;
    switch (this.type) {
    case Hex.Type.WATER:     color = "#66f"; break;
    case Hex.Type.MOUNTAIN:  color = "#666"; break;
    case Hex.Type.LAND:      color = "#9f9"; break;
    default:                 color = "#9f9"; break;
    }
    this.draw(color);
};

Hex.prototype.highlight = function() {
    this.draw("rgba(255,255,255,0.5)");
};

Hex.prototype.click = function(player) {
    if (this.type == Hex.Type.WATER || this.type == Hex.Type.MOUNTAIN) {
	helpText.innerHTML = "Water and mountain tiles are inaccessible.";
	return;
    }

    if (this.building == Hex.Building.PORT ||
	this.building == Hex.Building.AIRPORT) {
	helpText.innerHTML = "Port and Airport cannot be selected.";
	return;
    }

    if (politicsActive) {
	this.doPolitics(player);
	return;
    }

    if (player.owned.size == 0) {
	if (this.building != Hex.Building.EMPTY) {
	    helpText.innerHTML =
		"Please choose an empty tile to enter the board.";
	    return;
	}
	player.buy(this);
	return;
    }

    if (player.owned.has(this)) {
	if (this.type == Hex.Type.LAND) {
	    helpText.innerHTML =
		"Player buildings cannot be built here. "
		+ "Use Politics button for neutral buildings.";
	    return;
	}
	if (player.paid.size == 0) {
	    if (!player.plan.has(this) &&
		this.building == Hex.Building.HOUSE) {
		helpText.innerHTML =
		    "You already have a building here.";
		return;
	    } else {
		player.build(this);
	    }
	} else {
	    helpText.innerHTML =
		"You must unselect paid areas before you can build.";
	}
	return;
    }

    if (this.owner == null && this.building != Hex.Building.EMPTY) {
	if (this.building == Hex.Building.DISC) {
	    helpText.innerHTML =
		"Use Politics button for building neutral buildings.";
	}
	return;
    }

    if (player.plan.size != 0) {
	helpText.innerHTML = "Building in process, cannot buy land now.";
	return;
    }

    // Reachability check
    var reachable = this.isReachable(player);

    if (reachable) {
	if (this.owner != null) {
	    player.pay(this);
	} else {
	    player.buy(this);
	}
    } else {
	helpText.innerHTML = "Unreachable area.";
    }
};

sorter = function(a, b) {
    if (a.col == b.col) {
	return a.row - b.row;
    }
    return a.col - b.col;
};

Hex.prototype.doPolitics = function(player) {
    if (politicsPlan.has(this)) {
	politicsPlan.delete(this);
	this.refresh();
    } else {
	politicsPlan.add(this);
	this.highlight();
    }
    var it = politicsPlan[Symbol.iterator]();
    var hex1;
    var hex2;
    var hex3;
    politicsButton1.hidden = true;
    politicsButton2.hidden = true;
    switch (politicsPlan.size) {
    case 1:
	hex1 = it.next().value;
	if (hex1.building == Hex.Building.DISC && hex1.owner == null) {
	    var policeOK = game.policeCount > 0 && player.money >= policeCost;
	    var parkOK = game.parkCount > 0 && player.money >= parkCost;
	    if (policeOK) {
		politicsText1.innerHTML = "Police";
		politicsButton1.hidden = false;
	    }
	    if (parkOK) {
		politicsText2.innerHTML = "Park";
		politicsButton2.hidden = false;
	    }
	    if (!parkOK && !policeOK) {
		helpText.innerHTML = "Cannot build Park or Police. ";
		if (player.money < parkCost) {
		    helpText.innerHTML += "Not enough money.";
		} else {
		    helpText.innerHTML += "No buildings remaining.";
		}
	    }
	}
	break;
    case 2:
	hex1 = it.next().value;
	hex2 = it.next().value;
	var neighbors1 = hex1.getNeighbors();
	var neighbors2 = hex2.getNeighbors();
	var notNeighbors = true;
	neighbors1.forEach(function(hex) {
	    if (hex == hex2) notNeighbors = false;
	});
	if (notNeighbors) {
	    var commonNeighbors = new Array();
	    neighbors1.forEach(function(hex) {
		for (var i = 0; i < neighbors2.length; i++) {
		    if (neighbors2[i] == hex) commonNeighbors.push(hex);
		}
	    });
	    if (commonNeighbors.length == 2) {
		if (commonNeighbors[0].type == commonNeighbors[1].type) {
		    var exists = false;
		    this.grid.bridges.forEach(function(bridge) {
			if ((bridge[0] == hex1 && bridge[1] == hex2) ||
			    (bridge[1] == hex1 && bridge[0] == hex2)) {
			    exists = true;
			}
		    });
		    if (exists) {
			helpText.innerHTML = "Bridge or Tunnel already exists.";
		    }
		    else if (commonNeighbors[0].type == Hex.Type.WATER) {
			if (player.money >= bridgeCost) {
			    politicsText1.innerHTML = "Bridge";
			    politicsButton1.hidden = false;
			} else {
			    helpText.innerHTML = "Not enough money for Bridge.";
			}
		    } else if (commonNeighbors[0].type == Hex.Type.MOUNTAIN) {
			if (player.money >= tunnelCost) {
			    politicsText1.innerHTML = "Tunnel";
			    politicsButton1.hidden = false;
			} else {
			    helpText.innerHTML = "Not enough money for Tunnel.";
			}
		    }
		}
	    }
	} else {
	    var nextToWater = false;
	    neighbors1.forEach(function(hex) {
		if (hex.type == Hex.Type.WATER) nextToWater = true;
	    });
	    if (nextToWater) {
		nextToWater = false;
		neighbors2.forEach(function(hex) {
		    if (hex.type == Hex.Type.WATER) nextToWater = true;
		});
		if (nextToWater) {
		    if (hex1.building == Hex.Building.DISC &&
			hex1.owner == null &&
			hex2.building == Hex.Building.DISC &&
			hex2.owner == null) {
			// Port is only possible when there are two
			// neutral discs next to each other and both
			// are adjacent to water.
			if (game.portCount == 0) {
			    helpText.innerHTML = "No Port buildings remaining.";
			} else if (player.money >= portCost) {
			    politicsText1.innerHTML = "Port";
			    politicsButton1.hidden = false;
			} else {
			    helpText.innerHTML = "Not enough money for Port.";
			}
		    }
		}
	    }
	}
	break;
    case 3:
	hex1 = it.next().value;
	hex2 = it.next().value;
	hex3 = it.next().value;
	var l = new Array();
	l.push(hex1);
	l.push(hex2);
	l.push(hex3);
	l.sort(sorter);
	hex3 = l.pop();
	hex2 = l.pop();
	hex1 = l.pop();
	var result = false;
	if (hex2.col == hex1.col + 1 && hex3.col == hex1.col + 2) {
	    if (hex1.col % 2 == 0) {
		result = (hex2.row == hex1.row - 1 && hex3.row == hex1.row - 1)
		    || (hex2.row == hex1.row && hex3.row == hex1.row + 1);
	    } else {
		result = (hex2.row == hex1.row && hex3.row == hex1.row - 1)
		    || (hex2.row == hex1.row + 1 && hex3.row == hex1.row + 1);
	    }
	} else if (hex2.col == hex1.col && hex3.col == hex2.col) {
	    result = hex2.row == hex1.row + 1 && hex3.row == hex1.row + 2;
	}
	if (result) {
	    if (hex1.building == Hex.Building.DISC &&
		hex1.owner == null &&
		hex2.building == Hex.Building.DISC &&
		hex2.owner == null &&
	        hex3.building == Hex.Building.DISC &&
	        hex3.owner == null) {
		// Airport is only possible when there are
		// 3 neutral discs in a row.
		if (game.airportCount == 0) {
		    helpText.innerHTML = "No Airport buildings remaining.";
		} else if (player.money >= airportCost) {
		    politicsText1.innerHTML = "Airport";
		    politicsButton1.hidden = false;
		} else {
		    helpText.innerHTML = "Not enough money for Airport.";
		}
	    }
	}
	break;
    default:
	break;
    }
};

addWork = function(hex, target, visited, work, player) {
    if (!visited.has(hex)) {
	if (hex == target) {
	    return true;
	}
	if (hex.owner == null &&
	    hex.building != Hex.Building.EMPTY) {
	    visited.add(hex);
	    work.push(hex);
	}
	if (player.paid.has(hex)) {
	    visited.add(hex);
	    work.push(hex);
	}
    }
    return false;
}

Hex.prototype.isReachable = function(player) {
    var visited = new Set();
    var work = new Array();
    var reachable = false;
    var self = this;
    player.owned.forEach(function(hex) {
	visited.add(hex);
	work.push(hex);
    });
    while (work.length != 0) {
	var h = work.pop();
	var neighbors = h.getNeighbors();
	neighbors.forEach(function(hex) {
	    if (reachable) return;
	    reachable = addWork(hex, self, visited, work, player);
	});
	for (var i = 0; i < this.grid.bridges.length; i++) {
	    if (reachable) return true;
	    if (this.grid.bridges[i][0] == h) {
		reachable = addWork(
		    this.grid.bridges[i][1], self, visited, work, player);
	    } else if (this.grid.bridges[i][1] == h) {
		reachable = addWork(
		    this.grid.bridges[i][0], self, visited, work, player);
	    }
	}
	if (reachable) return true;
    }
    return false;
}

Hex.prototype.getNeighbors = function() {
    var result = new Array();
    var top = this.row == 0;
    var bottom = this.row == this.grid.rowCount - 1;
    var left = this.col == 0;
    var right = this.col == this.grid.colCount - 1;

    if (!top)
	result.push(this.grid.columns[this.col][this.row - 1]);

    if (!right) {
	if (this.col % 2 == 0) {
	    if (!top)
		result.push(this.grid.columns[this.col + 1][this.row - 1]);
	} else {
	    if (!bottom)
		result.push(this.grid.columns[this.col + 1][this.row + 1]);
	}
	result.push(this.grid.columns[this.col + 1][this.row]);
    }

    if (!bottom)
	result.push(this.grid.columns[this.col][this.row + 1]);

    if (!left) {
	if (this.col % 2 == 0) {
	    if (!top)
		result.push(this.grid.columns[this.col - 1][this.row - 1]);
	} else {
	    if (!bottom)
		result.push(this.grid.columns[this.col - 1][this.row + 1]);
	}
	result.push(this.grid.columns[this.col - 1][this.row]);
    }

    return result;
};

//===================================================================== Player

var resIncome = [8, 7, 6, 5, 4, 3, 2, 1, 0];
var comIncome = [9, 6, 4, 2, 0];
var indIncome = [11, 8, 5, 3, 0];

var resCrime = [0, 1, 1, 1, 1, 0, 0, 0];
var comCrime = [0, 2, 1, 1, 0];
var indCrime = [0, 2, 2, 1, 1];

function Player(color) {
    this.owned = new Set();
    this.paid = new Set();
    this.plan = new Set();
    this.color = color;
    this.money = 100;
    this.range = 3;
    this.discs = 10;
    this.crimeTokens = 10;
    this.resHouses = 7;
    this.comHouses = 4;
    this.indHouses = 4;
};

Player.prototype.buy = function(hex) {
    this.owned.add(hex);
    this.paid.forEach(function(hex) {
	hex.refresh();
    });
    this.paid.clear();
    hex.owner = this;
    hex.building = Hex.Building.DISC;
    hex.refresh();
    game.endTurn();
};

Player.prototype.pay = function(hex) {
    if (this.paid.has(hex)) {
	// Undo payment
	this.paid.delete(hex);
	hex.refresh();

	// Remove unreachable payments
	var self = this;
	var unreachables = new Array();
	this.paid.forEach(function(paidHex) {
	    if (!paidHex.isReachable(self)) {
		unreachables.push(paidHex);
	    }
	});
	unreachables.forEach(function(paidHex) {
	    self.paid.delete(paidHex);
	    paidHex.refresh();
	});
	return;
    }
    this.paid.add(hex);
    hex.highlight();
};

Player.prototype.build = function(hex) {
    if (this.plan.has(hex)) {
	// Undo building
	this.plan.delete(hex);
	hex.building = Hex.Building.DISC;
	hex.refresh();
    } else {
	this.plan.add(hex);
	hex.building = Hex.Building.HOUSE;
	hex.refresh();
	hex.highlight();
    }

    var it = this.plan[Symbol.iterator]();
    if (this.plan.size == 1) {
	var hex = it.next().value;
	var connection = false;
	var oost;
	var crimeTokensNeeded = 0;
	if (hex.type == Hex.Type.COMMERCE) {
	    if (this.comHouses == 0) {
		helpText.innerHTML = "No commerces left.";
		buildButton.disabled = true;
		return;
	    }
	    var distance = bfs(hex, "Airport");
	    connection = distance != -1;
	    cost = game.comPrice;
	    crimeTokensNeeded = comCrime[this.comHouses];
	} else if (hex.type == Hex.Type.INDUSTRY) {
	    if (this.indHouses == 0) {
		helpText.innerHTML = "No industries left.";
		buildButton.disabled = true;
		return;
	    }
	    var distance = bfs(hex, "Port");
	    connection = distance != -1;
	    cost = game.indPrice;
	    crimeTokensNeeded = indCrime[this.indHouses];
	} else {
	    if (this.resHouses == 0) {
		helpText.innerHTML = "No residences left.";
		buildButton.disabled = true;
		return;
	    }
	    cost = game.resPrice;
	    crimeTokensNeeded = resCrime[this.resHouses];
	}
	if (this.money < cost) {
	    helpText.innerHTML = "Not enough money.";
	    buildButton.disabled = true;
	    return;
	}
	if (!connection) crimeTokensNeeded++;
	if (crimeTokensNeeded > this.crimeTokens) {
	    helpText.innerHTML = "Too much crime.";
	    return;
	}
	buildButton.disabled = false;
	// OK
    } else if (this.plan.size == 2) {
 	var hex1 = it.next().value;
	var hex2 = it.next().value;
	if (hex1.type == hex2.type ||
	    (hex1.type == Hex.Type.COMMERCE && hex2.type == Hex.Type.INDUSTRY) ||
	    (hex1.type == Hex.Type.INDUSTRY && hex2.type == Hex.Type.COMMERCE)) {
	    helpText.innerHTML = "Please select residence + commerce or residence + industry to build.";
	    buildButton.disabled = true;
	    return;
	}
	var cost = 0;
	var crimeTokensNeeded = 0;
	if (hex1.type == Hex.Type.RESIDENCE || hex2.type == Hex.Type.RESIDENCE) {
	    if (this.resHouses == 0) {
		helpText.innerHTML = "No residences left.";
		buildButton.disabled = true;
		return;
	    }
	    cost += game.resPrice;
	    crimeTokensNeeded += resCrime[this.resHouses];
	}
	if (hex1.type == Hex.Type.COMMERCE || hex2.type == Hex.Type.COMMERCE) {
	    if (this.comHouses == 0) {
		helpText.innerHTML = "No commerces left.";
		buildButton.disabled = true;
		return;
	    }
	    cost += game.comPrice;
	    crimeTokensNeeded += comCrime[this.comHouses];
	}
	if (hex1.type == Hex.Type.INDUSTRY || hex2.type == Hex.Type.INDUSTRY) {
	    if (this.indHouses == 0) {
		helpText.innerHTML = "No industries left.";
		buildButton.disabled = true;
		return;
	    }
	    cost += game.indPrice;
	    crimeTokensNeeded += indCrime[this.indHouses];
	}
	if (this.money < cost) {
	    helpText.innerHTML = "Not enough money.";
	    buildButton.disabled = true;
	    return;
	}
	if (crimeTokensNeeded > this.crimeTokens) {
	    helpText.innerHTML = "Too much crime.";
	    return;
	}
	if (bfs(hex1, hex2) == -1) {
	    helpText.innerHTML = "Not enough range for the distance.";
	    buildButton.disabled = true;
	    return;
	}
	buildButton.disabled = false;
	// OK
    } else {
	buildButton.disabled = true;
    }
};

bfsWork = function(hex, visited, work) {
    if (hex.building != Hex.Building.EMPTY) {
	if (!visited.has(hex)) {
	    visited.add(hex);
	    work.push(hex);
	}
    }
}

function BFSBridge(dst) {
    this.grid = dst;
}

bfs = function(src, dst) {
    var visited = new Set();
    var work = new Array();
    visited.add(src);
    work.push(src);
    work.push(null);
    var distance = 0;
    while (work.length != 0) {
	var h = work.shift();
	if (h == null) {
	    if (work.length == 0 || work[0] == null) {
		break;
	    }
	    distance++;

	    // Optimization, stop search
	    if (distance > game.getCurrentPlayer().range) {
		return -1;
	    }

	    work.push(null);
	    continue;
	}

	// Hack to add distance for bridges
	if (h.grid != src.grid) {
	    // Grid is same for all Hexes, but not
	    // for BFSBridge type.
	    bfsWork(h.grid, visited, work);
	    continue;
	}

	if (dst == "Airport") {
	    if (h.building == Hex.Building.AIRPORT) return distance;
	} else if (dst == "Port") {
	    if (h.building == Hex.Building.PORT) return distance;
	} else if (h == dst) {
	    return distance;
	}
	var neighbors = h.getNeighbors();
	neighbors.forEach(function(hex) {
	    bfsWork(hex, visited, work);
	});
	for (var i = 0; i < h.grid.bridges.length; i++) {
	    if (h.grid.bridges[i][0] == h) {
		if (!visited.has(h.grid.bridges[i][1])) {
		    work.push(new BFSBridge(h.grid.bridges[i][1]));
		}
	    } else if (h.grid.bridges[i][1] == h) {
		if (!visited.has(h.grid.bridges[i][0])) {
		    work.push(new BFSBridge(h.grid.bridges[i][0]));
		}
	    }
	}
    }
    return -1;
}

//=========================================== Game

function Game(playerCount) {
    this.playerCount = playerCount;
    this.players = new Array();
    this.firstPass = 0;

    if (playerCount > 0) this.players.push(new Player("#f00"));
    if (playerCount > 1) this.players.push(new Player("#00f"));
    if (playerCount > 2) this.players.push(new Player("#0f0"));
    if (playerCount > 3) this.players.push(new Player("#dd0"));
    if (playerCount > 4) this.players.push(new Player("#111"));

    this.currentPlayerIndex = 0;
    this.activePlayers = this.players.slice();

    this.policeCount = 5;
    this.parkCount = 5;
    this.portCount = 5;
    this.airportCount = 5;

    this.resPrice = 4;
    this.comPrice = 12;
    this.indPrice = 8;
}

Game.prototype.endTurn = function() {
    helpText.innerHTML = "";
    this.currentPlayerIndex++;
    this.currentPlayerIndex %= this.activePlayers.length;
}

Game.prototype.pass = function() {
    helpText.innerHTML = "";
    if (this.activePlayers.length == this.players.length) {
	this.firstPass = this.currentPlayerIndex;
    }
    if (this.activePlayers.length == 1) {
	this.currentPlayerIndex = this.firstPass;
	this.activePlayers = this.players.slice();

	this.players.forEach(function(player) {
	    player.owned.forEach(function(hex) {
		if (hex.building == Hex.Building.DISC) {
		    hex.owner = null;
		    hex.refresh();
		}
	    });
	    player.owned.clear();
	});
    } else {
	this.activePlayers.splice(this.currentPlayerIndex, 1);
	this.currentPlayerIndex %= this.activePlayers.length;
    }
}

Game.prototype.getCurrentPlayer = function() {
    return this.activePlayers[this.currentPlayerIndex];
}
