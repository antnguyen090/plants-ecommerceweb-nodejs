const mongoose = require('mongoose');
const { Schema } = mongoose;
const databaseConfig = require(__path_configs + 'database');

var schema = new mongoose.Schema({
    name: String, 
    slug: String,
    status: String,
    ordering: Number,
    parentMenu: String,
},
{ timestamps: true }
);

module.exports = mongoose.model(databaseConfig.col_menubar, schema );




