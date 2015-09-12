var ui = new UI();

//=================================================================== COMMANDS

/*** BUY ***/

function BuyCommand() {
    this.paid = new Set();
    this.hex = null;
    this.player = ui.game.getCurrentPlayer();
}

BuyCommand.prototype.canExecute = function() {
    return this.hex != null;
}

BuyCommand.prototype.click = function(hex) {

    // Unselect
    if (this.hex == hex) {
	this.select(hex);
	return "";
    }

    // Undo payment
    if (this.paid.has(hex)) {
	this.unpay(hex);

	// Remove unreachable payments
	var unreachables = new Array();
	var self = this;
	this.paid.forEach(function(paidHex) {
	    if (!isReachable(paidHex, self.player.owned, self.paid)) {
		unreachables.push(paidHex);
	    }
	});
	unreachables.forEach(function(paidHex) {
	    self.unpay(paidHex);
	});

	// Unselect target if it's unreachable
	if (this.hex != null) {
	    if (!isReachable(this.hex, this.player.owned, this.paid)) {
		this.select(this.hex);
	    }
	}
	return "";
    }

    // Give help for invalid clicks
    if (hex.type == Hex.Type.WATER)
	return "Water tiles are inaccessible.";
    if (hex.type == Hex.Type.MOUNTAIN)
	return "Mountain tiles are inaccessible.";
    if (hex.building != Hex.Building.EMPTY &&
	hex.owner == null)
	return "Neutral buildings cannot be selected when buying land.";
    if (hex.owner == this.player) {
	return "You already own this land.";
    }

    if (this.player.owned.size == 0) {
	if (hex.building != Hex.Building.EMPTY) {
	    return "Please choose an empty tile to enter the board.";
	}
	this.select(hex);
	return "";
    }

    // Reachability check
    var reachable = isReachable(hex, this.player.owned, this.paid);

    if (reachable) {
	if (hex.owner != null) {
	    if (this.player.money <= this.paid.size)
		return "You don't have enough money to pay for connection.";
	    this.pay(hex);
	} else {
	    if (this.player.discs == 0)
		return "You have no discs remaining.";
	    this.select(hex);
	}
    } else {
	return "Unreachable tile.";
    }
    return "";
}

BuyCommand.prototype.execute = function() {
    this.hex.refresh();
    this.player.discs--;
    this.player.owned.add(this.hex);
    var self = this;
    this.paid.forEach(function(paidHex) {
	self.player.money--;
	paidHex.owner.money++;
	paidHex.refresh();
    });
    this.hex = null;
    this.paid.clear();
}

BuyCommand.prototype.abort = function() {
    this.select(this.hex);
    var self = this;
    this.paid.forEach(function(paidHex) {
	self.unpay(paidHex);
    });
}

BuyCommand.prototype.pay = function(hex) {
    this.paid.add(hex);
    hex.highlight();
}

BuyCommand.prototype.unpay = function(hex) {
    this.paid.delete(hex);
    hex.refresh();
}

BuyCommand.prototype.select = function(hex) {

    var old = this.hex;

    if (old != hex) {
	hex.building = Hex.Building.DISC;
	hex.owner = this.player;
	hex.refresh();
	hex.highlight();
	this.hex = hex;
    } else {
	this.hex = null;
    }

    // Unselect old selection
    if (old != null) {
	old.building = Hex.Building.EMPTY;
	old.owner = null;
	old.refresh();
    }

}

/*** BUILD ***/

function BuildCommand() {
    this.plan = [null, null, null]; // res, com, ind
    this.player = ui.game.getCurrentPlayer();
    this.verified = false;
}

BuildCommand.prototype.canExecute = function() {
    if (this.plan[0] == null && this.plan[1] == null &&
	this.plan[2] == null)
	return false;

    return this.verified;
}

BuildCommand.prototype.click = function(hex) {

    var index;
    if (hex.type == Hex.Type.RESIDENCE) index = 0;
    else if (hex.type == Hex.Type.COMMERCE) index = 1;
    else index = 2;

    // Unselect
    if  (this.plan[index] == hex) {
	this.verified = false;
	this.plan[index] = null;
	this.unselect(hex);
	return this.updateCrime();
    }

    // Give help for invalid clicks
    if (hex.type == Hex.Type.WATER)
	return "Water tiles are inaccessible.";
    if (hex.type == Hex.Type.MOUNTAIN)
	return "Mountain tiles are inaccessible.";
    if (hex.type == Hex.Type.LAND)
	return "You cannot build any buildings here.";
    if (hex.building != Hex.Building.EMPTY &&
	hex.owner == null)
	return "Neutral buildings cannot be selected when building.";
    if (hex.building != Hex.Building.DISC && hex.owner == this.player)
	return "You already have building here.";
    if (hex.owner != this.player)
	return "You don't own this tile.";

    // Check that there are enough buildings
    if (index == 0 && this.player.resHouses == 0)
	return "You don't have any residences remaining.";
    if (index == 1 && this.player.comHouses == 0)
	return "You don't have any commerces remaining.";
    if (index == 2 && this.player.indHouses == 0)
	return "You don't have any industries remaining.";

    // Check for illegal building combination
    if (index == 1 && this.plan[2] != null)
	return "You cannot build commerce, because you already have industry selected.";
    if (index == 2 && this.plan[1] != null)
	return "You cannot build industry, because you already have commerce selected.";

    var newPlan = [this.plan[0], this.plan[1], this.plan[2]];
    newPlan[index] = hex;

    // Warn when there's not enough money
    if (this.player.money < this.countCost(newPlan))
	return "You don't have enough money to build this.";

    // Warn when distance is too large when building 2
    if (!this.rangeCheck(newPlan))
	return "You don't have enough range for the connection.";

    this.verified = false;
    if (this.plan[index] != null) {
	this.unselect(this.plan[index]);
    }

    this.plan[index] = hex;
    hex.building = Hex.Building.HOUSE;

    // Warn when crime tokens would run out
    return this.updateCrime();
}

BuildCommand.prototype.execute = function() {
    for (var i = 0; i < 3; i++) {
	if (this.plan[i] != null) {
	    this.plan[i].refresh();
	    this.player.crimeTokens -= this.plan[i].crime;
	}
    }
    if (this.plan[0] != null) this.player.resHouses--;
    if (this.plan[1] != null) this.player.comHouses--;
    if (this.plan[2] != null) this.player.indHouses--;

    this.player.money -= this.countCost(this.plan);
    this.player.usedDiscs++;

    if (this.plan[0] != null)
	if (ui.game.resPrice < 12) ui.game.resPrice++;
    else
	if (ui.game.resPrice > 4) ui.game.resPrice--;
    if (this.plan[1] != null)
	if (ui.game.comPrice < 12) ui.game.comPrice++;
    else
	if (ui.game.comPrice > 4) ui.game.comPrice--;
    if (this.plan[2] != null)
	if (ui.game.indPrice < 12) ui.game.indPrice++;
    else
	if (ui.game.indPrice > 4) ui.game.indPrice--;

    this.plan = [null, null, null];
    this.verified = false;
}

BuildCommand.prototype.abort = function() {
    this.verified = false;

    if (this.plan[0] != null) this.unselect(this.plan[0]);
    if (this.plan[1] != null) this.unselect(this.plan[1]);
    if (this.plan[2] != null) this.unselect(this.plan[2]);
}

BuildCommand.prototype.unselect = function(hex) {
    hex.building = Hex.Building.DISC;
    hex.crime = 0;
    hex.refresh();
}

BuildCommand.prototype.countCost = function(plan) {
    var cost = 0;
    if (plan[0] != null)
	cost += ui.game.resPrice;
    if (plan[1] != null)
	cost += ui.game.comPrice;
    if (plan[2] != null)
	cost += ui.game.indPrice;
    return cost;
}

BuildCommand.prototype.rangeCheck = function(plan) {
    if (plan[0] != null) {
	var distance = 0;
	if (plan[1] != null)
	    distance = bfs(plan[0], plan[1]);
	if (plan[2] != null)
	    distance = bfs(plan[0], plan[2]);
	return distance != -1;
    }
    return true;
}

BuildCommand.prototype.updateCrime = function() {
    var tokensNeeded = [0, 0, 0];
    if (this.plan[0] != null)
	tokensNeeded[0] = ui.game.resCrime[this.player.resHouses];
    if (this.plan[1] != null)
	tokensNeeded[1] = ui.game.comCrime[this.player.comHouses];
    if (this.plan[2] != null)
	tokensNeeded[2] = ui.game.indCrime[this.player.indHouses];

    if (this.plan[0] != null && this.plan[1] == null && this.plan[2] == null)
	tokensNeeded[0]++;
    if (this.plan[0] == null && this.plan[1] != null)
	if (bfs(this.plan[1], "Airport") == -1)
	    tokensNeeded[1]++;
    if (this.plan[0] == null && this.plan[2] != null)
	if (bfs(this.plan[2], "Port") == -1)
	    tokensNeeded[2]++;

    // Update visual crime tokens
    for (var i = 0; i < 3; i++) {
	if (this.plan[i] != null) {
	    this.plan[i].crime = tokensNeeded[i];
	    this.plan[i].refresh();
	    this.plan[i].highlight();
	}
    }

    // Warn when crime tokens would run out
    var sum = tokensNeeded[0] + tokensNeeded[1] + tokensNeeded[2];
    if (sum > this.player.crimeTokens)
	return "Too much crime. You don't have enough crime tokens left.";

    this.verified = true;
    return "";
}

/*** POLITICS ***/

function PoliticsCommand() {
    this.plan = new Map(); // hex -> original building
    this.player = ui.game.getCurrentPlayer();
    this.bridge = false;
    this.verified = false;
}

PoliticsCommand.prototype.canExecute = function() {
    return this.verified;
}

// Check that hex1 and hex2 terrain matches
// and it's either water or mountain.
checkTerrain = function(hex1, hex2) {
    if (hex1.type == hex2.type)
	if (hex1.type == Hex.Type.WATER ||
	    hex1.type == Hex.Type.MOUNTAIN)
	    return true;
    return false;
}

// Get a list of two tiles, which are sides
// of the bridge, or null if a bridge cannot
// be built between the given hexagons. Input
// must be a sorted list of two tiles.
getBridgeTiles = function(list) {

    if (list.length != 2)
	return null;

    var parity = list[0].col % 2 == 0;
    var grid = ui.grid;

    // right
    if (list[1].col == list[0].col + 2 &&
	list[1].row == list[0].row) {
	if (list[0].row != (parity ? 0 : (grid.rowCount - 1))) {
	    var col = grid.columns[list[0].col + 1];
	    var hex1 = col[list[0].row - (parity ? 1 : 0)];
	    var hex2 = col[list[0].row + (parity ? 0 : 1)];
	    if (checkTerrain(hex1, hex2))
	        return [hex1, hex2];
	}
    }

    if (list[1].col == list[0].col + 1) {

	// top-right
	if (list[1].row == list[0].row - (parity ? 2 : 1)) {
	    if (list[0].row >= (parity ? 2 : 1)) {
		var hex1 = grid.columns[list[0].col][list[0].row - 1];
		var hex2 = grid.columns[list[1].col][list[1].row + 1];
		if (checkTerrain(hex1, hex2))
		    return [hex1, hex2];
	    }
	}

	// bottom-right
	if (list[1].row == list[0].row + (parity ? 1 : 2)) {
	    if (list[0].row < grid.rowCount - (parity ? 1 : 2)) {
		var hex1 = grid.columns[list[0].col][list[0].row + 1];
		var hex2 = grid.columns[list[1].col][list[1].row - 1];
		if (checkTerrain(hex1, hex2))
		    return [hex1, hex2];
	    }
	}
    }

    return null;
}

checkNeutralDiscs = function(list) {
    var result = true;
    list.forEach(function(hex) {
	if (hex.owner != null || hex.building != Hex.Building.DISC)
	    result = false;
    });
    return result;
}

checkAirport = function(hex1, hex2, hex3) {
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
    return result;
}

refreshSpecialBuildings = function() {
    ui.grid.ports.forEach(function(x) {
	ui.grid.drawPort(x[0], x[1], x[2]);
    });
    ui.grid.airports.forEach(function(x) {
	ui.grid.drawAirport(x[0], x[1], x[2]);
    });
}

PoliticsCommand.prototype.click = function(hex) {

    // Give help for invalid clicks
    if (hex.type == Hex.Type.WATER)
	return "Water tiles are inaccessible.";
    if (hex.type == Hex.Type.MOUNTAIN)
	return "Mountain tiles are inaccessible.";

    this.verified = false;

    // Select or unselect
    if (this.plan.has(hex)) {

	if (this.plan.size == 1 &&
	    hex.building == Hex.Building.POLICE) {
	    hex.building = Hex.Building.PARK;
	    hex.refresh();
	    hex.highlight();

	    if (ui.game.parkCount == 0)
		return "All Parks are already built.";
	    if (ui.game.parkCost > this.player.money)
		return "Not enough money to build Park.";

	    this.verified = true;
	    return "";
	}

	this.clearBridge();
	hex.building = this.plan.get(hex);
	this.plan.delete(hex);
	hex.refresh();
    } else {
	this.clearBridge();
	this.plan.set(hex, hex.building);
    }

    // Reset everything back to normal
    var list = new Array();
    this.plan.forEach(function(value, key, map) {
	list.push(key);
	key.building = value;
	key.refresh();
	key.highlight();
    });

    refreshSpecialBuildings();

    list.sort(sorter);

    switch (list.length) {
    case 1:
	if (!checkNeutralDiscs(list))
	    return "Police can only be built on top of neutral discs.";

	list[0].building = Hex.Building.POLICE;
	list[0].refresh();
	list[0].highlight();

	if (ui.game.policeCount == 0)
	    return "All Polices are already built.";
	if (ui.game.policeCost > this.player.money)
	    return "Not enough money to build Police.";
	break;
    case 2:
	var tiles = getBridgeTiles(list);
	if (tiles != null) {
	    var exists = false;
	    ui.grid.bridges.forEach(function(bridge) {
		// TODO: Could be simplified
		if ((bridge[0] == list[0] && bridge[1] == list[1]) ||
		    (bridge[1] == list[0] && bridge[0] == list[1])) {
		    exists = true;
		}
	    });

	    list[0].highlight();
	    list[1].highlight();
	    refreshSpecialBuildings();

	    var isBridge = tiles[0].type == Hex.Type.WATER;
	    if (!exists) {
		ui.grid.drawBridge(list[0], list[1]);
		this.bridge = true;
		if (isBridge && ui.game.bridgeCost > this.player.money)
		    return "Not enough money for the bridge.";
		if (!isBridge && ui.game.tunnelCost > this.player.money)
		    return "Not enough money for the tunnel.";
	    } else {
		if (isBridge)
		    return "Bridge already exists.";
		else
		    return "Tunnel already exists.";
	    }
	} else {
	    var neighbors1 = list[0].getNeighbors();
	    var neighbors2 = list[1].getNeighbors();
	    var neighbors = false;
	    var nextToWater = [false, false];
	    neighbors1.forEach(function(hex) {
		if (hex == list[1]) neighbors = true;
		if (hex.type == Hex.Type.WATER) nextToWater[0] = true;
	    });
	    if (!neighbors)
		return "To build a Port, choose neighboring tiles.";
	    neighbors2.forEach(function(hex) {
		if (hex.type == Hex.Type.WATER) nextToWater[1] = true;
	    });
	    if (!nextToWater[0] || !nextToWater[1])
		return "To build a Port, both tiles must be next to water.";
	    if (!checkNeutralDiscs(list))
		return "Port can only be built on top of neutral discs.";

	    list[0].building = Hex.Building.PORT;
	    list[1].building = Hex.Building.PORT;
	    list[0].refresh();
	    list[1].refresh();
	    list[0].highlight();
	    list[1].highlight();
	    ui.grid.drawPort(list[0], list[1]);

	    if (ui.game.portCount == 0)
		return "All Ports are already built.";
	    if (ui.game.portCost > this.player.money)
		return "Not enough money for the Port.";
	}
	break;
    case 3:
        if (!checkAirport(list[0], list[1], list[2]))
	    return "Airport must be built on 3 tiles, which form a straight line.";
        if (!checkNeutralDiscs(list))
	    return "Airport can only be built on top of neutral discs.";

        list[0].building = Hex.Building.AIRPORT;
        list[1].building = Hex.Building.AIRPORT;
        list[2].building = Hex.Building.AIRPORT;
	list[0].refresh();
	list[1].refresh();
	list[2].refresh();
	list[0].highlight();
	list[1].highlight();
	list[2].highlight();
        ui.grid.drawAirport(list[0], list[1], list[2]);

        if (ui.game.airportCount == 0)
	    return "All Airports are already built.";
        if (ui.game.airportCost > this.player.money)
	    return "Not enough money for the Airport.";

        break;
    default:
        return "Select 1 tile to build Police or Park. Select 2 tiles to build " +
	    "Bridge, Tunnel or Port. Select 3 tiles to build Airport.";
    }
    this.verified = true;
    return "";
}

PoliticsCommand.prototype.clearBridge = function() {
    if (this.bridge) {
	var list = new Array();
	this.plan.forEach(function(value, key, map) {
	    list.push(key);
	});
	list.sort(sorter);
	var tiles = getBridgeTiles(list);
	if (tiles != null) {
	    tiles[0].refresh();
	    tiles[1].refresh();
	}
    }
    this.bridge = false;
}

PoliticsCommand.prototype.execute = function() {
    var list = new Array();
    this.plan.forEach(function(value, key, map) {
	list.push(key);
	key.refresh();
    });
    list.sort(sorter);
    if (this.bridge) {
	ui.grid.bridges.push(list);
	refreshSpecialBuildings();
    } else {
	switch (list[0].building) {
	case Hex.Building.POLICE:
	    ui.game.policeCount--;
	    this.player.money -= ui.game.policeCost;
	    break;
	case Hex.Building.PARK:
	    ui.game.parkCount--;
	    this.player.money -= ui.game.parkCost;
	    break;
	case Hex.Building.PORT:
	    ui.game.portCount--;
	    this.player.money -= ui.game.portCost;
	    ui.grid.ports.push([list[0], list[1]]);
	    ui.grid.drawPort(list[0], list[1]);
	    break;
	case Hex.Building.AIRPORT:
	    ui.game.airportCount--;
	    this.player.money -= ui.game.airportCost;
	    ui.grid.airports.push([list[0], list[1], list[2]]);
	    ui.grid.drawAirport(list[0], list[1], list[2]);
	    break;
	}
    }

    this.plan.clear();
    this.bridge = false;
    this.verified = false;
}

PoliticsCommand.prototype.abort = function() {
    this.verified = false;
    this.clearBridge();

    this.plan.forEach(function(value, key, map) {
	key.building = value;
	key.refresh();
    });
    refreshSpecialBuildings();
    this.plan.clear();
}

/*** SELL ***/

function SellCommand() {
    this.plan = new Set();
    this.player = ui.game.getCurrentPlayer();
}

SellCommand.prototype.canExecute = function() {
    return true;
}

SellCommand.prototype.click = function(hex) {
    // Unselect
    if (this.plan.has(hex)) {
	hex.owner = this.player;
	this.plan.delete(hex);
	hex.refresh();
	return "";
    }

    if (hex.building != Hex.Building.DISC || hex.owner != this.player)
	return "You can only select tiles where you have disc.";

    this.plan.add(hex);
    hex.owner = null;
    hex.refresh();
    hex.highlight();
    return "";
}

SellCommand.prototype.execute = function() {
    var self = this;
    this.plan.forEach(function(hex) {
	self.player.owned.delete(hex);
	hex.refresh();
	self.player.discs++;
    });
    this.plan.clear();
}

SellCommand.prototype.abort = function() {
}

//================= UI

UI.Action = {
    NOTHING : 0,
    BUY : 1,
    BUILD : 2,
    POLITICS : 3,
    SELL : 4
}

function UI() {
    this.game = null;
    this.grid = null;

    // Currently selected action
    this.action = null;

    // Set of selected hexagons
    this.command = null;

    this.startButton = document.getElementById("startButton");
    this.buyButton = document.getElementById("buyButton");
    this.buildButton = document.getElementById("buildButton");
    this.politicsButton = document.getElementById("politicsButton");
    this.loanButton = document.getElementById("loanButton");
    this.executeButton = document.getElementById("executeButton");
    this.passButton = document.getElementById("passButton");
    this.helpText = document.getElementById("helpText");

    this.startButton.disabled = false;
    this.buyButton.disabled = true;
    this.buildButton.disabled = true;
    this.politicsButton.disabled = true;
    this.loanButton.disabled = true;
    this.executeButton.disabled = true;
    this.passButton.disabled = true;
}

UI.prototype.switchAction = function(action) {
    // Clear the old plan
    if (this.command != null) {
	this.command.abort();
    }

    if (this.action == action) {
	this.action = UI.Action.NOTHING;
	this.command = null;
    } else {
	this.action = action;
	switch (action) {
	case UI.Action.BUY:
	    this.command = new BuyCommand();
	    break;
	case UI.Action.BUILD:
	    this.command = new BuildCommand();
	    break;
	case UI.Action.POLITICS:
	    this.command = new PoliticsCommand();
	    break;
	case UI.Action.SELL:
	    this.command = new SellCommand();
	    break;
	}
    }

    this.refreshButtons();
}

UI.prototype.click = function(hex) {

    if (this.command != null) {
	var msg = this.command.click(hex);
	this.helpText.innerHTML = msg;
    } else {
	this.helpText.innerHTML = "Select an action before clicking on the map.";
    }

    this.validateButtons();
}

UI.prototype.refreshButtons = function() {

    this.validateButtons();

    this.buyButton.style.backgroundColor = null;
    this.buildButton.style.backgroundColor = null;
    this.politicsButton.style.backgroundColor = null;

    var player = this.game.getCurrentPlayer();
    var color = player.color;

    switch (this.action) {
    case UI.Action.BUY:
	this.buyButton.style.backgroundColor = color;
	break;
    case UI.Action.BUILD:
	this.buildButton.style.backgroundColor = color;
	break;
    case UI.Action.POLITICS:
	this.politicsButton.style.backgroundColor = color;
	break;
    }
}

UI.prototype.validateButtons = function() {

    switch (this.action) {
    case UI.Action.BUY:
    case UI.Action.BUILD:
    case UI.Action.POLITICS:
    case UI.Action.NOTHING:
	this.buyButton.disabled = !this.validateDiscs();
	this.buildButton.disabled = false;
	this.politicsButton.disabled = false;
	this.loanButton.disabled = !this.validateDiscs();
	this.executeButton.disabled = !this.validateExecute();
	this.passButton.disabled = false;
	break;
    case UI.Action.SELL:
	this.buyButton.disabled = true;
	this.buildButton.disabled = true;
	this.politicsButton.disabled = true;
	this.loanButton.disabled = true;
	this.executeButton.disabled = false;
	this.passButton.disabled = true;
	break;
    }
}

UI.prototype.validateExecute = function() {

    if (this.action == UI.Action.NOTHING) return false;

    if (this.command != null) {
	return this.command.canExecute();
    }
    return false;
}

UI.prototype.validateDiscs = function() {
    var player = this.game.getCurrentPlayer();
    return player.discs > 0;
}

function log(msg) {
    setTimeout(function() {
        throw new Error(msg);
    }, 0);
};

startClick = function() {
    if (ui.command != null) {
	ui.command.abort();
	ui.command = null;
    }
    ui.action = UI.Action.NOTHING;

    ui.game = new Game(2);
    if (ui.grid == null) {
	ui.grid = new HexagonGrid("HexCanvas", 30);
    }
    ui.grid.initialize(7, 10, 5, 5, false);

    ui.refreshButtons();
}

buyClick = function() {
    ui.switchAction(UI.Action.BUY);
}

buildClick = function() {
    ui.switchAction(UI.Action.BUILD);
}

politicsClick = function() {
    ui.switchAction(UI.Action.POLITICS);
}

loanClick = function() {
    if (ui.command != null) {
	ui.command.abort();
	ui.command = null;
    }
    ui.action = UI.Action.NOTHING;
    var player = ui.game.getCurrentPlayer();
    player.money += 10;
    player.loans++;
    player.discs--;

    ui.refreshButtons();

    ui.game.endTurn();
}

passClick = function() {
    if (ui.command != null) {
	ui.command.abort();
	ui.command = null;
    }
    ui.action = UI.Action.NOTHING;

    ui.refreshButtons();

    ui.game.pass();
}

executeClick = function() {
    if (ui.command != null) {
	ui.command.execute();
	ui.command = null;
	ui.action = UI.Action.NOTHING;
	ui.refreshButtons();
	ui.game.endTurn();
    }
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
    this.ports = new Array();
    this.airports = new Array();

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
	hex.click();
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

Hex.prototype.click = function() {
    ui.click(this);
}

sorter = function(a, b) {
    if (a.col == b.col) {
	return a.row - b.row;
    }
    return a.col - b.col;
};

addWork = function(hex, target, visited, work, paid) {
    if (!visited.has(hex)) {
	if (hex == target) {
	    return true;
	}
	if (hex.owner == null &&
	    hex.building != Hex.Building.EMPTY) {
	    visited.add(hex);
	    work.push(hex);
	}
	if (paid.has(hex)) {
	    visited.add(hex);
	    work.push(hex);
	}
    }
    return false;
}

isReachable = function(dst, owned, paid) {
    var visited = new Set();
    var work = new Array();
    var reachable = false;
    owned.forEach(function(hex) {
	visited.add(hex);
	work.push(hex);
    });
    while (work.length != 0) {
	var h = work.pop();
	var neighbors = h.getNeighbors();
	neighbors.forEach(function(hex) {
	    if (reachable) return;
	    reachable = addWork(hex, dst, visited, work, paid);
	});
	for (var i = 0; i < ui.grid.bridges.length; i++) {
	    if (reachable) return true;
	    if (ui.grid.bridges[i][0] == h) {
		reachable = addWork(
		    ui.grid.bridges[i][1], dst, visited, work, paid);
	    } else if (ui.grid.bridges[i][1] == h) {
		reachable = addWork(
		    ui.grid.bridges[i][0], dst, visited, work, paid);
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

var initialMoney = 30;
var initialRange = 3;
var discsTotal = 10;
var crimeTotal = 10;
var baseIncome = -5;

function Player(color) {
    this.owned = new Set();
    this.color = color;
    this.money = initialMoney;
    this.range = initialRange;
    this.discs = discsTotal;
    this.loans = 0;
    this.crimeTokens = 10;
    this.resHouses = 7;
    this.comHouses = 4;
    this.indHouses = 4;
};

Player.prototype.spit = function() {
    var result = "";
    result += "Discs: " + this.discs;
    result += " Loans: " + this.loans;
    result += " Used Discs: " + (discsTotal - this.discs - this.loans);
    result += " Income: " + (baseIncome + this.discs + resIncome[this.resHouses] + comIncome[this.comHouses] + indIncome[this.indHouses] - crimeTotal + this.crimeTokens);
    return result;
}

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
	    if (distance > ui.game.getCurrentPlayer().range) {
		return -1;
	    }

	    work.push(null);
	    continue;
	}

	// Hack to add distance for bridges
	if (h.grid != ui.grid) {
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
	for (var i = 0; i < ui.grid.bridges.length; i++) {
	    if (ui.grid.bridges[i][0] == h) {
		if (!visited.has(ui.grid.bridges[i][1])) {
		    work.push(new BFSBridge(ui.grid.bridges[i][1]));
		}
	    } else if (ui.grid.bridges[i][1] == h) {
		if (!visited.has(ui.grid.bridges[i][0])) {
		    work.push(new BFSBridge(ui.grid.bridges[i][0]));
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

    this.bridgeCost = 2;
    this.tunnelCost = 2;
    this.policeCost = 10;
    this.parkCost = 5;
    this.portCost = 5;
    this.airportCost = 5;

    this.resCrime = [0, 1, 1, 1, 1, 0, 0, 0];
    this.comCrime = [0, 2, 1, 1, 0];
    this.indCrime = [0, 2, 2, 1, 1];

    this.sellPhase = false;
}

Game.prototype.endTurn = function() {
    this.currentPlayerIndex++;
    this.currentPlayerIndex %= this.activePlayers.length;
    if (this.sellPhase) {
	if (this.currentPlayerIndex == this.firstPass) {
	    this.sellPhase = false;
	} else {
	    this.sellDiscs();
	}
    }
}

Game.prototype.pass = function() {
    if (this.activePlayers.length == this.players.length) {
	this.firstPass = this.currentPlayerIndex;
    }
    if (this.activePlayers.length == 1) {
	this.currentPlayerIndex = this.firstPass;
	this.activePlayers = this.players.slice();

	this.sellPhase = true;
	this.sellDiscs();
    } else {
	this.activePlayers.splice(this.currentPlayerIndex, 1);
	this.currentPlayerIndex %= this.activePlayers.length;
    }
}

Game.prototype.sellDiscs = function() {
    var result = false;
    var player = this.getCurrentPlayer();
    player.owned.forEach(function(hex) {
	if (hex.building == Hex.Building.DISC)
	    result = true;
    });

    // Do not ask to sell discs if there are none
    if (result) {
	ui.switchAction(UI.Action.SELL);
	ui.helpText.innerHTML = "Select discs which you want to give away.";
    } else {
	this.endTurn();
    }
}

Game.prototype.getCurrentPlayer = function() {
    return this.activePlayers[this.currentPlayerIndex];
}
