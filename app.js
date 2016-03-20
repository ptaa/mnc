// Dependencies
var express = require('express'),
	routes = require('./routes'),
	http = require('http'),
	path = require('path'),
	passport = require('passport'),
	GoogleStrategy = require('passport-google').Strategy;

// Game library
var hobochess = require('./lib/hobochess');



// Passport setup
// https://github.com/jaredhanson/passport-google <--check for documentation
passport.serializeUser(function(user, done) {
	done(null, user);
});
passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

var port = 80;
// 'http://ec2-54-246-71-33.eu-west-1.compute.amazonaws.com';
// Use google for authentication
passport.use(new GoogleStrategy({		
		returnURL: 'http://ec2-54-246-71-33.eu-west-1.compute.amazonaws.com/auth/google/return',
		realm: 'http://ec2-54-246-71-33.eu-west-1.compute.amazonaws.com'
	}, function(identifier, profile, done) {
		profile.identifier = identifier;
		return done(null, profile);
	}
));
var ensureAuthenticated = function(req, res, next) {
	if (req.isAuthenticated()) { return next(); }
	res.redirect('/login');
};

// Our HTTP app
var app = express();

// HTTP app configuration
// all environments
app.configure(function() {
	app.set('port', process.env.PORT || port);
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.favicon());
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser('your secret here'));
	app.use(express.session());
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(app.router);
	app.use(require('stylus').middleware(__dirname + '/public'));
	app.use(express.static(path.join(__dirname, 'public')));
});

// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}

// Routes
app.get('/', ensureAuthenticated, routes.index);
app.get('/login', routes.login);
app.get('/logout', routes.logout);

// Passport routes
app.get('/auth/google',
	passport.authenticate('google', { failureRedirect: '/login' }),
	function(req, res) {
		res.redirect('/');
	});
app.get('/auth/google/return',
	passport.authenticate('google', { failureRedirect: '/login' }),
	function(req, res) {
		res.redirect('/');
	});

// Start the HTTP server
var server = http.createServer(app);
server.listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});

// Our Socket.IO app
var io = require('socket.io').listen(server);

// Here we keep the game queue
var queue = [];

// Here we keep information about each game
var games = {};

// Open the database connection
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/hobochess');
var db = mongoose.connection;
//Throw error if connection fails
db.on('error', console.error.bind(console, 'connection error:'));
var highscoreSchema = mongoose.Schema({
	name: String,
	userId: String,
	wins: Number
});
var highscore = mongoose.model('highscore', highscoreSchema);

// Set up Socket.IO events
io.sockets.on('connection', function (socket) {
	// store basic information about this connection
	socket.displayName = "not authenticated";
	socket.userId = undefined;
	socket.gameId = undefined;

	socket.on('search for game', function(data) {
		// reset basic information
		socket.displayName = data.name;
		socket.userId = data.id;
		console.log("Name: " + socket.displayName + "\nId: " + socket.userId);
		socket.gameId = undefined;

		// add connection to the game queue
		queue.push(socket);

		// Pair users if we have two users
		if (queue.length >= 2) {
			var user1 = queue.shift(),
				user2 = queue.shift();

			// Create new game for the two users
			var game = hobochess.createGame(user1, user2);
			user1.gameId = game.id;
			user2.gameId = game.id;

			games[game.id] = game;

			game.players.forEach(function(player) {
				// join game room
				player.join(game.id);

				// send message to client to initiate game
				player.emit('joined game', {});
				
				//Turn info (as its not working from lib/hobochess. Figure it out.
				player.emit('turn info', {
					board: game.board,
					turn: (game.players[game.turn] === player),
					turnNumber: game.turnNumber,
					isWon: game.gameIsWon
				});
				console.log("turn:" + game.turn);
				

				// send information about the users connecting
				game.players.forEach(function(p) {
					player.emit('user connected', {name: p.displayName});
				});
			});
		}
	});
	
	
	socket.on('player move', function(data) {
		//get game
		var game = games[socket.gameId];
		var move = data;
		//log move to console
		console.log(move);
		//check if legal move
		//could playerturn and legalmove checks be moved to hobochess?
		if ((game.isPlayersTurn(socket))&&(!game.gameIsWon)) {
			if (game.isLegalMove(move)) {
				game.makeMove(socket, move);
				console.log("Move made.");
				
				//Check for winner (start after turn number 8 (zero indexed)
				if (game.turnNumber > 7) {
					var winner = game.winner();
					if (winner !== false) {						
						highscore.findOne({'userId':winner.userId}, 'name userId wins', function(err, query) {
						
							if (err) {
								console.log(err);
							} else if (query !== null){
								//FOR TESTING
								var tmpId = query.userId;
								var tmpWins = query.wins;
								console.log("winner.userId: " + winner.userId);
								console.log("query.userId: " + query.userId);
								console.log("query.name:" + query.name);
							
								console.log("tmmpWins:" + tmpWins);
								console.log("tmmpId:" + tmpId);
								highscore.update({userId:tmpId}, {$set:{wins:(tmpWins + 1)}},{multi:false}, function(err, numAffected) {
									if (!err) {
										console.log(numAffected + " documents were updated.");
									} else {
										console.log(err);
									};
									highscore.find({},{name:1,wins:1,_id:0}).sort({"wins":-1}).limit(10).lean().exec(function(err,q) {
										console.log("Query: " + JSON.stringify(query));							
										io.sockets.in(socket.gameId).emit('scoretable', q);
									});
								});								
							} else {
								var tmpSave = new highscore({name:winner.displayName, userId:winner.userId, wins:1});
								console.log("!!!We should be here only if there's a new user.");
								tmpSave.save(function (err) {
									if (err) console.log(err);
									highscore.find({},{name:1,wins:1,_id:0}).sort({"wins":-1}).limit(10).lean().exec(function(err,q) {
										console.log("Query: " + JSON.stringify(q));							
										io.sockets.in(socket.gameId).emit('scoretable', q);
									});
								});
							}
						});
						
						/*highscore.find({},{name:1,wins:1,_id:0}).sort({"wins":-1}).limit(10).lean().exec(function(err,query) {
							console.log("Query: " + JSON.stringify(query));							
							io.sockets.in(socket.gameId).emit('scoretable', query);
						});*/
						
						io.sockets.in(socket.gameId).emit('winner', winner.displayName);
						
					};
										
				}
			} else {
				//tell client that move is illegal
				console.log("Illegal move");
			}
		} else {
			//Client is out of order!
			console.log("not clients turn");
		}
		// Inform the clients of the move
		game.players.forEach(function(player) {
			player.emit('turn info', {
				board: game.board,
				turn: (game.players[game.turn] === player),
				turnNumber: game.turnNumber,
				isWon: game.gameIsWon
			});
			console.log("gameiswon: " + game.gameIsWon);
		});
		
	});
	
	socket.on('message', function(data) {
		if (socket.gameId) {
			// send message to the players
			io.sockets.in(socket.gameId).emit('message', {
				date: data.date,
				message: data.message,
				from: socket.displayName
			});
		}
	});
	
	socket.on('player is typing', function() {
		var game = games[socket.gameId];
		game.players.forEach(function(player) {
			if (socket.id !== player.id) {
				player.emit('player is typing');
			}
		});
	});
	
	socket.on('player is not typing', function() {
		var game = games[socket.gameId];
		game.players.forEach(function(player) {
			if (socket.id !== player.id) {
				player.emit('player is not typing');
			}
		});
	});

	socket.on('disconnect', function() {
		if (queue.indexOf(socket) !== -1) {
			queue.splice(queue.indexOf(socket), 1);
		}
		if (socket.gameId) {
			// tell players that a user disconnected
			io.sockets.in(socket.gameId).emit('user disconnected', {
				name: socket.displayName
			});

			// tell the player that the game ended
			io.sockets.in(socket.gameId).emit('game ended', {});

			// clean up game
			if (socket.gameId in games) {
				delete games[socket.gameId];
			}
		}
	});
});

