const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db.sqlite3');
const app = express();
const port = process.env.PORT || 8000;
var request = require('request');

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
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

// Views and assets
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname,'views'));
app.set('view engine', 'ejs');

// Routing
app.get('/', (req, res, next)=>{
	db.all("SELECT * FROM posts", function(err, rows){
		res.render('index', {posts: rows});
	});
});

app.get('/new', (req, res, next)=>{
	res.render('newpost');
});

app.post('/new', (req, res, next)=>{
	var newpost = {
		title: req.body.title,
		body: req.body.body
	};
	request.post('http://localhost:8000/posts', {json: newpost},
		(err, req, bod) => {
			console.log(err);
		}
	);
	res.redirect('/posts');
});


app.get('/posts', (req, res, next) => {
	db.all("SELECT * FROM posts", function(err, rows) {
		res.render('index', {posts: rows});
	});
});

app.post('/posts', (req, res, next) => {
	console.log(req.body);
	db.run("INSERT INTO posts(title, body) VALUES (?, ?)", [req.body.title, req.body.body]);
	res.redirect('/posts');		
	
});

app.get('/posts/:id', (req, res, next) => {
	console.log(req.params.id);	
	db.get("SELECT * FROM posts WHERE id = ?", [req.params.id], function(err, row){
		console.log(row);
		res.render('show', {post: row});
	});
});

app.post('/posts/:id', (req, res, next) => {
	db.run("UPDATE posts SET title = ?, body = ? WHERE id = ?", [req.body.title, req.body.body, req.params.id]);
	res.redirect(`/posts/${req.params.id}`);
});

app.get('/edit/:id', (req, res, next)=>{
	db.get("SELECT * FROM posts WHERE id = ?", [req.params.id], function(err, row){
		console.log(row);
		res.render('editpost', {post: row});
	});
});

app.post('/edit/:id', (req, res, next) => {
	var newpost = {
		title: req.body.title,
		body: req.body.body
	};
	request.post(`http://localhost:8000/posts/${req.params.id}`, {json: newpost},
		(err, req, bod) => {
			console.log(err);
		}
	);
	res.redirect(`/posts/${req.params.id}`);
}); 

// Listen
app.listen(port, () => {
	console.log(`Application is listen at port ${port}: http://localhost:${port}`);
});
