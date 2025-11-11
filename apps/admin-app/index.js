const express = require('express');
const app = express();
const port = process.env.PORT || 4000;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');
app.set('views', './views');

app.get('/', (req, res) => {
  res.redirect('/review');
});

app.use('/review', require('./routes/review'));

app.listen(port, () => {
  console.log(`Admin app listening at http://localhost:${port}`);
});
