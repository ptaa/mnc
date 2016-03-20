/*
 * GET home page.
 */

exports.index = function(req, res) {
	console.log(req.user);
	res.render('index', {
		title: 'Hobo Chess',
		user: req.user
	});
};
exports.login = function(req, res) {
	res.render('login', {
		title: 'Login to Hobo Chess'
	});
};
exports.logout = function(req, res) {
	req.logout();
	res.redirect('/');
};
