const express = require('express');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db.sqlite3');
const app = express();
const port = process.env.PORT || 8000;
const request = require('request');

// SQLite3 setup
db.serialize(() => {
	db.run(`CREATE TABLE IF NOT EXISTS posts(
		id INTEGER PRIMARY KEY NOT NULL,
		title VARCHAR(50) NOT NULL,
		body TEXT NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
	`);
	db.run(`CREATE TRIGGER IF NOT EXISTS tg_posts_updated_at
		AFTER UPDATE
		ON posts FOR EACH ROW
		BEGIN
			UPDATE posts SET updated_at = current_timestamp
			WHERE id = old.id;
		END;
	`);
});

// Middleware
app.use(cookieParser());
const csrfProtection = csrf({ cookie: true });
const parseForm = bodyParser.urlencoded({extended:false});
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

// Views and assets
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname,'views'));
app.set('view engine', 'ejs');

// Routing
app.get('/', parseForm, csrfProtection, (req, res, next)=>{
	db.all("SELECT * FROM posts", function(err, rows){
		res.render('index', {posts: rows, csrfToken: req.csrfToken() });
	});
});

app.get('/new', csrfProtection, (req, res)=>{
	res.render('newpost', { csrfToken: req.csrfToken() });
});

app.get('/posts', parseForm, csrfProtection, (req, res, next) => {
	db.all("SELECT * FROM posts", function(err, rows) {
		res.render('index', {posts: rows, csrfToken: req.csrfToken()});
	});
});

app.post('/posts', parseForm, csrfProtection, (req, res) => {
	console.log(req.body);
	db.run("INSERT INTO posts(title, body) VALUES (?, ?)", [req.body.title, req.body.body]);
	res.redirect('/posts');
	
});

app.get('/posts/:id', (req, res) => {
	console.log(req.params.id);	
	db.get("SELECT * FROM posts WHERE id = ?", [req.params.id], function(err, row){
		console.log(row);
		res.render('show', {post: row});
	});
});

app.post('/posts/:id', parseForm, csrfProtection, (req, res) => {
	db.run("UPDATE posts SET title = ?, body = ? WHERE id = ?", [req.body.title, req.body.body, req.params.id]);
	res.redirect(`/posts/${req.params.id}`);
});

app.post('/posts/:id/delete', parseForm, csrfProtection, (req, res) => {
	db.run("DELETE FROM posts WHERE id = ?", [req.params.id]);
	res.redirect('/posts');
});

app.get('/edit/:id', parseForm, csrfProtection, (req, res)=>{
	db.get("SELECT * FROM posts WHERE id = ?", [req.params.id], function(err, row){
		console.log(row);
		res.render('editpost', {post: row, csrfToken: req.csrfToken()});
	});
}); 

// Listen
app.listen(port, () => {
	console.log(`Application is listening at port ${port}: http://localhost:${port}`);
});
