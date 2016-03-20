// Set up the socket io connection
var socket = io.connect(window.location.protocol + '//' + window.location.hostname + ':' + window.location.port);
//Add an extra chatinfo field
$('#input').append('<span id="chatinfo"></span>');

var endGame = function() {
	// Show the search for new game button
	$('#reconnect').show();

	// we don't need the warning about reloading any more
	$(window).off('beforeunload');
};

socket.on('connect', function() {
	socket.emit('search for game', {name: displayName, id: userId});
});
socket.on('disconnect', function() {
	$('#messages').append('<p>Lost connection to server!</p>');
	endGame();
});

socket.on('user connected', function(data) {
	// display who connected
	$('#messages').append('<p>' + data.name + ' connected!</p>');
});
socket.on('user disconnected', function(data) {
	// display who disconnected
	$('#messages').append('<p>' + data.name + ' disconnected!</p>');
});
socket.on('message', function(data) {
	// display chat message
	var $message = $('<div class="message" />');
	var d = new Date(data.date);

	$message.append('<span class="timestamp">' + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes() + '</span>');
	$message.append('<span class="name">' + data.from + '</span>');
	$message.append('<span class="text">' + data.message + '</span>');

	$('#messages').append($message);
	document.getElementById("chatinfo").innerHTML = "";
});

socket.on('joined game', function(data) {
	// TODO: set up the game board
	// show the game
	$('#loading').fadeOut(function() {
		$('#gamespace').fadeIn();
	});
	// Cleanup input
	$('#tmpmessage').html("");
	

	// warn user before navigating away from the page
	$(window).on('beforeunload', function(){
		return 'Game in progress. Are you sure you want to leave?';
	});
});


socket.on('turn info', function(data) {
	//Populate game board and display user turn messages.
	var board = data.board;
	var turn = data.turn;
	var turnNummber = data.turnNumber;
	var isWon = data.isWon;
	console.log(isWon);

	$('#gametable').html('');

	for (var j = 0; j < board.length; j++) {
		var $row = $('<tr></tr>');
		for (var i = 0; i < board[0].length; i++) {
			var sign = '';
			if (board[j][i] === 0) {
				sign = 'O';
			} else if (board[j][i] === 1) {
				sign = 'X';
			}
			$row.append('<td>' + sign + '</td>');
		}
		$('#gametable').append($row);
	}
	//Inform the player whose turn it is	
	if ((turn)&&(!isWon)) {
		$('#tmpmessage').html("<p>Make your move!</p>");
	} else if (!isWon) {
		$('#tmpmessage').html("<p>Wait for the other player!</p>");
	}
	
});

socket.on('winner', function(data) {
	
	$('#tmpmessage').html('<p><span class="winner">' + data + '</span> wins the game!</p>');

	//Show the victory modal
	if ($('#victory-modal').length == 0) {	
		var $modal = $('<div id=victory-modal title="Scoretable"><p>LOADING...</p></div>').appendTo($('#game'));
		$modal.dialog();
	} else {
		$('#victory-modal').dialog();
	}
	//Run the endGame function
	endGame();	
});

socket.on('scoretable', function(data){
	//The late delivery of the scoretable could be a good thing to talk about?
	console.log("Scoretable delivery!");
	var html = "";
	for (var i=0; i < data.length; i++) {
		console.log("<p>" + data[i].name + " Wins: " + data[i].wins + "<p>");
		html = html + "<p>" + data[i].name + " Wins: " + data[i].wins + "<p>";
	}
	$('#victory-modal').html(html);
	
});

socket.on('game ended', endGame);

socket.on('player is typing', function(data) {
	document.getElementById("chatinfo").innerHTML = "Your opponent is typing.";
});
socket.on('player is not typing', function(data) {
	document.getElementById("chatinfo").innerHTML = "";
	console.log("Empty chatinfo");
});

$('#reconnect').on('click', function() {
	// hide new game button
	$('#reconnect').hide();

	// fade out the game board and show the connecting screen
	$('#gamespace').fadeOut(function() {
		$('#messages').html('');
		$('#loading').fadeIn(function() {
			// put the user in the game queue again
			socket.emit('search for game', {name: displayName, id: userId});
		});
	});
});

// send the contents of the input when it changes
var isTyping = false;
$('#chat input').on('keyup', function(e) {
	// listen to enter key
	if (e.which === 13 && $(this).val().length > 0) {
		// Get the value from the input box
		var message = $(this).val();

		// Send the message to the server
		socket.emit('message', {
			date: (new Date()).valueOf(),
			message: message
		});

		// Empty the input box
		$(this).val('');
		isTyping = false;
		socket.emit('player is not typing');
	}
	if (!isTyping) {
		socket.emit('player is typing');
	}
	if ($('#chat input').val() == "") {
		isTyping = false;
		socket.emit('player is not typing');
	} else {
		isTyping = true;
	}
});

// new input method to test game logic
$('#gametable').on('click', 'td', function() {
	socket.emit('player move', move = {
		x: $(this).index(),
		y: $(this).parent().index()
	});
});

// Resize game board when window changes size
$(window).on('resize', function() {
	$('#game').width($(this).width() - $('#chat').width());
}).trigger('resize'); // trigger it on load so that the game board is resized on start

//The end of game dialog.
$(function() {
	$( "#dialog" ).dialog();
});