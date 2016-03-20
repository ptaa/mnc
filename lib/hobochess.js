/**
 * Chess game logic
 * Constructor
 */
var Game = function(gameId, player1, player2) {
	// our game id (String)
	this.id = gameId;

	// the players of the game (sockets)
	this.players = [player1, player2];

	// Initialise game board
	this.board = new Array(25);
	for (var i = 0; i < 25; i++) {
		this.board[i] = new Array(25);
	}
	
	//Set everything to -1
	for (var j = 0; j < this.board.length; j++) {
		for (var i = 0; i < this.board[j].length; i++) {
			this.board[j][i] = -1;
		}
	}
	//Pre-seed so i don't have to click so much...
	/*this.board[5][5] = 1;
	this.board[5][6] = 1;
	this.board[5][7] = 1;
	this.board[5][8] = 1;*/
	//Keep track of what turn we are on, so we don't have to check for winners
	//while there still can't be any. 
	this.turnNumber = 1;
	

	// index of player whose turn is next (not random yet as testing)
	this.turn = Math.floor(Math.random() * 2);
	
	//to quickly see if a game is finished
	this.gameIsWon = false;

};

/**
 * Checks if the move is legal (i.e. if suggested coordinate = -1
 * Returns true if legal
 */
Game.prototype.isLegalMove = function(move) {
	// Check if the move is legal
	// Check if defined
	if ((move.y !== undefined)&&(move.y !== null)&&(move.x !== undefined)&&(move.x !== null)) {
		if (move.y > this.board.length-1) {
			return false;
		}
		if (move.x > this.board[0].length-1) {
			return false;
		}
		if (this.board[move.y][move.x] == -1) {
			return true;
		}
	}	
	return false;
};

/**
 * Checks if it's this player's turn
 * Returns {boolean} true if it is this player's turn
 */
Game.prototype.isPlayersTurn = function(player) {
	//....
	console.log("This.turn:" + this.turn + "\nthis.players.indexOf(player): " + this.players.indexOf(player));
	return this.turn === this.players.indexOf(player);
};

/**
 * makes move
 */
Game.prototype.makeMove = function(player, move) {
	//Check legality and whose turn it is here instead?
	//Make the move
	this.board[move.y][move.x] = this.turn;

	// advance turn counter
	this.turnNumber++;
	// advance turn to the next player
	this.turn = (this.players.indexOf(player) + 1) % this.players.length;
};

/**
 * Checks if either user has won
 * Returns {object} if one user has won: the winning user, otherwise: false
 */
Game.prototype.winner = function() {
	//Create variable for counting noughts and crosses in a row.
	var max = [0,0];
	//Check vertical
	for (i = 0; i < this.board[0].length; i++) {
		var tmp = this.diagonal([0,i],[1,0])
		max[0] = Math.max(max[0], tmp[0]);
		max[1] = Math.max(max[1], tmp[1]);
	}
	console.log("\nVertical check:\nMax P1: " + max[0] + "\nMax P2: " + max[1]);
	//Check horizontal
	for (i = 0; i < this.board.length; i++) {
		var tmp = this.diagonal([i,0],[0,1])
		max[0] = Math.max(max[0], tmp[0]);
		max[1] = Math.max(max[1], tmp[1]);
	}
	console.log("\nHorizontal check:\nMax P1: " + max[0] + "\nMax P2: " + max[1]);

	// Check for diagonal win. Or headache. Either which.   
	// Starts from the first diagonal long enough for a win (length -5) and goes back to row 0
	// Direction for diagonals top left to bottom right
	for (i = this.board.length - 5; i >= 0; i--) {
		var tmp = this.diagonal([i,0],[1,1])
		max[0] = Math.max(max[0], tmp[0]);
		max[1] = Math.max(max[1], tmp[1]);
	}
	console.log("\nDiagonal pass 1 check:\nMax P1: " + max[0] + "\nMax P2: " + max[1]);
	// Same as above, except starts from Row 0, Column 1 and continues right.
	for (i = 1 ; i <= this.board[0].length - 5; i++) {
		var tmp = this.diagonal([0,i],[1,1])
		max[0] = Math.max(max[0], tmp[0]);
		max[1] = Math.max(max[1], tmp[1]);
	}
	console.log("\nDiagonal pass 2 check:\nMax P1: " + max[0] + "\nMax P2: " + max[1]);
	// Diagonals top right, to bottom left
	// First pass
	for (i = 0 ; i <= this.board.length - 5; i++) {
		var tmp = this.diagonal([i,(this.board.length-1)],[1,-1])
		max[0] = Math.max(max[0], tmp[0]);
		max[1] = Math.max(max[1], tmp[1]);
	}
	
	console.log("\nDiagonal pass 3 check:\nMax P1: " + max[0] + "\nMax P2: " + max[1]);	
	// Diagonals top right, to bottom left
	// Second pass
	for (i = this.board.length-2; i >= 3; i--) {
		var tmp = this.diagonal([0,i],[1,-1]);
		max[0] = Math.max(max[0], tmp[0]);
		max[1] = Math.max(max[1], tmp[1]);
	}	
	console.log("\nDiagonal pass 4 check:\nMax P1: " + max[0] + "\nMax P2: " + max[1]);	
		
	if ((max[0] > 4)||(max[1] > 4)) {
		this.gameIsWon = true;
		if (max[0] > max[1]) {
			console.log("\nPlayer 1 wins.");
			return this.players[0];
		} else {
			console.log("\nPlayer 2 wins.");
			return this.players[1];
		}
	}	
	return false;
 };
 /**
 * Counts the highest number of tokens in a row in a given direction
 * Returns an array with the highest count for either player
 */
 Game.prototype.diagonal = function(startpos, direction) {
	var position = startpos;
	var max = [0,0];
	var count = 1;
	var last = -1;
	while ((position[0] >= 0)&&(position[1] >= 0)&&(position[0] < this.board.length)&&(position[1] < this.board[0].length)) {
			//console.log("\nthis.board[position[0]][position[1]] : " + this.board[position[0]][position[1]]);
			if ((last === this.board[position[0]][position[1]])&&(last !== -1)){
				count++;
				if (count > max[last]) { max[last] = count; }
			} else {
				count = 1;
			}			
			last = this.board[position[0]][position[1]];
			//Direction
			position[0] = position[0] + direction[0];
			position[1] = position[1] + direction[1];
	}
	return max;
 }

/**
 * Game builder
 * Input variables are sockets
 */
exports.createGame = function(player1, player2) {
	// Create a unique game id
	var gameId = (new Date()).valueOf() + '-' + Math.floor(Math.random() * 1000000);

	return new Game(gameId, player1, player2);
};
