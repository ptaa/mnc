Project description - Multiplayer five in a row
The screencast for this project can be found here  http://youtu.be/EZfaUPAhzQU

The project aims to create a simple online multiplayer game of noughts and crosses. If time permits it will also include a chat function. The game will handle login, game lobby and the playing field all on the same page. 

Both client and server side functionality will be built with node.js and and socket.io. the Jade template engine. For the client side socket.io will be used. As both node.js and socket.io are event driven they should be a reasonable fit for a five in a row game. 

For authenticating players the game will use a local password and/or oAuth, and that functionality will be provided by Passport. Whether oAuth is used depends on how complex it would be to implement it. 

Mongoose and mongodb will be used for data storage.