const path = require('path');
const express = require('express');

const listingsRouter = require('./routes/listings');
const seoRouter = require('./routes/seo');

const app = express();
const port = process.env.PORT || 4000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.locals.appName = 'Mega Directory Admin';

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.redirect('/listings');
});

app.use('/listings', listingsRouter);
app.use('/seo', seoRouter);

app.use((req, res) => {
  res.status(404).render('errors/not-found', {
    title: 'Not Found',
  });
});

app.listen(port, () => {
  console.log(`Admin app listening at http://localhost:${port}`);
});
