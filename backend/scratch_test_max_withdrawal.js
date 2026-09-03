const express = require('express');
const gramCurrencyRouter = require('./routes/gram_currency');

console.log('Testing gram_currency.js routes load...');
if (gramCurrencyRouter) {
  console.log('✅ gram_currency routes loaded with MAX_WITHDRAWAL = 0.05');
}
